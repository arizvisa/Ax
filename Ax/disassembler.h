#pragma once

#include <iostream>
#include <iomanip>
#include <stdexcept>

#include <capstone.h>

/** class definitions */
class Disassembler {
protected:
	/* protected properties */
	csh m_handle;

public:
	/* public properties */
	int m_bits;
	enum cs_opt_value m_syntax;

public:
	/* scoping methods */
	Disassembler()
	{
		cs_err err;
		#if defined(_M_AMD64) || defined(_M_X64)
			err = cs_open(CS_ARCH_X86, CS_MODE_64, &m_handle);
			m_bits = 64;
		#else
			err = cs_open(CS_ARCH_X86, CS_MODE_32, &m_handle);
			m_bits = 32;
		#endif
		if (err != CS_ERR_OK)
			throw std::invalid_argument(cs_strerror(err));

		syntax(CS_OPT_SYNTAX_DEFAULT);
		option(CS_OPT_DETAIL, CS_OPT_OFF);
		option(CS_OPT_SKIPDATA, CS_OPT_ON);
	}

	Disassembler(enum cs_mode mode) {
		auto err = cs_open(CS_ARCH_X86, mode, &m_handle);
		if (err != CS_ERR_OK)
			throw std::invalid_argument(cs_strerror(err));

		m_bits = (mode == CS_MODE_16) ? 16 : (mode == CS_MODE_32) ? 32 : (mode == CS_MODE_64) ? 64 : 0;
		syntax(CS_OPT_SYNTAX_DEFAULT);
		option(CS_OPT_DETAIL, CS_OPT_OFF);
		option(CS_OPT_SKIPDATA, CS_OPT_ON);
	}

	~Disassembler() throw()
	{
		auto err = cs_close(&m_handle);

		// FIXME: we shouldn't be throwing an exception, but hey..
		//        capstone claims to (on an invalid handle), so why can't we?
		if (err != CS_ERR_OK)
			throw std::runtime_error(cs_strerror(err));
	}

	/* methods */
	void option(enum cs_opt_type, size_t value);
	void mode(enum cs_mode);

	enum cs_opt_value syntax(enum cs_opt_value);

	int bits(int num);

	size_t size(intptr_t ea, size_t count);
	size_t disasm(intptr_t ea, size_t count, std::ostream& os);
};

class Dumper {
public:
	/* type-definitions */
	typedef void(Dumper::*dumptype)(intptr_t, size_t, std::ostream&);

private:
	/* private members */
	int m_bits;
	int m_width;

	const char unprintable = '.';
	const std::string divider = " | ";

protected:
	/* protected utility members */
	template <typename T>
	void item(T& value, std::ostream& os) {
		os << std::hex << std::setw(sizeof(T) * 2) << (int)value;
	}

	// Because the C++ standard sucks and doesn't allow you to use floating-point types as a typename...
	void item(float value, std::ostream& os);
	void item(double value, std::ostream& os);

	template <typename T>
	void items(intptr_t ea, size_t count, std::ostream& os) {
		T* p = reinterpret_cast<T*>(ea);
		for (size_t i = 0; i < count; i++) {
			if (i)
				os << " ";
			item(*p++, os);
		}
		return;
	}

	template <typename T>
	void padding(size_t count, std::ostream& os) {

		// calculate maximum size of type
		T value = T();
		std::stringstream il;
		item(value, il); il.flush();

		// convert it to a string
		std::string padding(il.str().length(), ' ');

		for (size_t i = 0; i < count; i++) {
			os << " ";
			os << padding;
		}
		return;
	}

	void address(intptr_t ea, std::ostream& os);
	void printable(intptr_t ea, size_t count, std::ostream& os);

public:
	/* public interface */
	Dumper(int bits, int width) : m_bits(bits), m_width(width) {}
	~Dumper() {}

	template <typename T>
	void dump(intptr_t ea, size_t count, std::ostream& os) {
		T* p = reinterpret_cast<T*>(ea);
		size_t row = m_width / sizeof(T);

		size_t leftover;
		for (size_t i = 0; i < count; i += row) {
			leftover = (count - i < row) ? count - i : row;

			address(ea, os);
			os << divider;

			items<T>(ea, leftover, os);
			padding<T>(row - leftover, os);
			os << divider;

			printable(ea, sizeof(T) * leftover, os);
			os << std::string(row - leftover, ' ');
			os << std::endl;

			ea += m_width;
		}
		os.flush();
	}
};