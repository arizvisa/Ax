#include "stdafx.h"

#include <iostream>
#include <iomanip>
#include <string>
#include <ctype.h>

#include "disassembler.h"

/** globals */
void
Disassembler::option(enum cs_opt_type type, size_t value)
{
	auto err = cs_option(m_handle, type, value);
	if (err != CS_ERR_OK)
		throw std::runtime_error(cs_strerror(err));

	// update internal state
	switch (type) {
	case CS_OPT_MODE:
		m_bits = (value == CS_MODE_16) ? 16 : (value == CS_MODE_32) ? 32 : (value == CS_MODE_64) ? 64 : m_bits;
		break;
	case CS_OPT_SYNTAX:
		m_syntax = static_cast<cs_opt_value>(value);
		break;
	}
}

enum cs_opt_value
Disassembler::syntax(enum cs_opt_value syntax)
{
	auto res = m_syntax;

	auto err = cs_option(m_handle, CS_OPT_SYNTAX, syntax);
	if (err != CS_ERR_OK)
		throw std::invalid_argument(cs_strerror(err));

	m_syntax = syntax;
	return res;
}

void
Disassembler::mode(enum cs_mode mode)
{
	auto err = cs_option(m_handle, CS_OPT_MODE, mode);
	if (err != CS_ERR_OK)
		throw std::invalid_argument(cs_strerror(err));
}

size_t
Disassembler::size(intptr_t ea, size_t count)
{
	size_t size, res = 0;
	const uint8_t* p = reinterpret_cast<uint8_t*>(ea);
	uint64_t offset = static_cast<uint64_t>(ea);

	cs_insn* ins = cs_malloc(m_handle);

	while (count > 0) {
		size = sizeof(ins->bytes);	// maximum size of an instruction should be 15-bytes. hopefully capstone honors that..
		try {
			if (!cs_disasm_iter(m_handle, &p, &size, &offset, ins))
				break;
		}
		catch (...)
		{
			break;
		}
		res += ins->size;
		count--;
	}
	return res;
}

size_t
Disassembler::disasm(intptr_t ea, size_t count, std::ostream& os)
{
	size_t res, cb;
	cs_insn* insns;

	cb = size(ea, count);
	count = res = cs_disasm(m_handle, reinterpret_cast<uint8_t*>(ea), cb, ea, 0, &insns);

	auto p = insns;
	while (res > 0) {
		os << std::hex << std::setfill('0') << std::setw(m_bits / 4) << p->address;
		os << " : " << p->mnemonic << " " << p->op_str;
		p++; res--;
		if (res)
			os << std::endl;
	}
	os.flush();

	cs_free(insns, count);
	return count;
}

size_t
Disassembler::bits(size_t num)
{
	auto res = m_bits;
	switch (num) {
	case 16: mode(CS_MODE_16); break;
	case 32: mode(CS_MODE_32); break;
	case 64: mode(CS_MODE_64); break;
	default:
		throw std::invalid_argument(std::to_string(num));
	}
	return m_bits;
}

void
Dumper::address(intptr_t ea, std::ostream& os)
{
	os << std::hex << std::setfill('0') << std::setw(m_bits / 4) << ea;
}

void
Dumper::printable(intptr_t ea, size_t count, std::ostream& os)
{
	uint8_t* p = reinterpret_cast<uint8_t*>(ea);
	uint8_t b;

	for (size_t i = 0; i < count; i++, p++) {
		b = *p;
		os << static_cast<char>(isprint(b) ? b : unprintable);
	}
}

void
Dumper::item(uint8_t value, std::ostream& os) {
	os << std::hex << std::setfill('0') << std::setw(2) << (int)(value&0xff);
}

void
Dumper::item(float value, std::ostream& os)
{
	static const char* scientific_chars = "-.e-";
	auto max_precision = std::numeric_limits<float>::digits10 + 1;
	os << std::scientific << std::setprecision(max_precision) << std::setw(5 + max_precision + sizeof(scientific_chars)) << std::setfill(' ') << value;
}

void
Dumper::item(double value, std::ostream& os)
{
	static const char* scientific_chars = "-.e-";
	auto max_precision = std::numeric_limits<double>::digits10 + 1;
	os << std::scientific << std::setprecision(max_precision) << std::setw(5 + max_precision + sizeof(scientific_chars)) << std::setfill(' ') << value;
}