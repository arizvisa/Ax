// Leaker.cpp : Implementation of CLeaker
#include "stdafx.h"
#include "Leaker.h"

#include <winternl.h>
#include <windows.h>
#include <comutil.h>

#include <sstream>
#include <cstdint>
using namespace std;

#include "disassembler.h"

/** globals */
namespace utils {
	/* integer dumpers */
	static struct {
		const char* type;
		Dumper::dumptype dumper;
	} dumptypes[] = {
		{ "uint8_t", &Dumper::dump<uint8_t> },
		{ "uint16_t", &Dumper::dump<uint16_t> },
		{ "uint32_t", &Dumper::dump<uint32_t> },
		{ "uint64_t", &Dumper::dump<uint64_t> },
		{ "float", &Dumper::dump<float> },
		{ "double", &Dumper::dump<double> },

		{ "ubyte1", &Dumper::dump<uint8_t> },
		{ "uint2", &Dumper::dump<uint16_t> },
		{ "uint4", &Dumper::dump<uint32_t> },
		{ "uint8", &Dumper::dump<uint64_t> },
		{ "binary32", &Dumper::dump<float> },
		{ "binary64", &Dumper::dump<double> },
		{ NULL, NULL }
	};

	/* disassembler syntax */
	static struct {
		const char* identifier;
		enum cs_opt_value option;
	} SyntaxList[] = {
		{"default", CS_OPT_SYNTAX_DEFAULT},
		{"intel", CS_OPT_SYNTAX_INTEL},
		{"att", CS_OPT_SYNTAX_ATT},
		{NULL, (cs_opt_value)0}
	};
}

/** disassembler utils */
namespace utils {
	enum cs_opt_value
	SyntaxToOption(const char* syntax)
	{
		auto p = &SyntaxList[0];
		while (p->identifier) {
			if (strcmp(syntax, p->identifier) == 0)
				return p->option;
			p++;
		}
		throw std::invalid_argument(syntax);
	}

	const char*
	OptionToSyntax(enum cs_opt_value option)
	{
		auto p = &SyntaxList[0];
		while (p->identifier) {
			if (p->option == option)
				return p->identifier;
			p++;
		}
		throw std::invalid_argument(std::to_string(option));
	}

	Dumper::dumptype
	CstringToDumptype(std::string type)
	{
		auto p = &dumptypes[0];
		while (p->type) {
			if (type.compare(p->type) == 0)
				return p->dumper;
			p++;
		}
		throw std::invalid_argument(type);
	}
}

/** NDK signatures */
namespace ndk {
	/* FIXME: replace this with the ndk repo */
	enum THREADINFOCLASS {
		ThreadBasicInformation
	};

	typedef NTSTATUS(WINAPI *PNtQueryInformationProcess)(HANDLE ProcessHandle, ::PROCESSINFOCLASS ProcessInformationClass, PVOID ProcessInformation, ULONG ProcessInformationLength, PULONG ReturnLength);
	typedef NTSTATUS(WINAPI *PNtQueryInformationThread)(HANDLE ThreadHandle, ::THREADINFOCLASS ThreadInformationClass, PVOID ThreadInformation, ULONG ThreadInformationLength, PULONG ReturnLength);

	typedef LONG NTSTATUS;
	typedef DWORD KPRIORITY;
	typedef WORD UWORD;

	typedef struct _CLIENT_ID
	{
		PVOID UniqueProcess;
		PVOID UniqueThread;
	} CLIENT_ID, *PCLIENT_ID;

	typedef struct _THREAD_BASIC_INFORMATION
	{
		NTSTATUS                ExitStatus;
		PVOID                   TebBaseAddress;
		CLIENT_ID               ClientId;
		KAFFINITY               AffinityMask;
		KPRIORITY               Priority;
		KPRIORITY               BasePriority;
	} THREAD_BASIC_INFORMATION, *PTHREAD_BASIC_INFORMATION;
}

/** general utilities */
namespace utils {
	// byte
	static uint8_t
	ubyte1(intptr_t ea)
	{
		return *(uint8_t*)(ea);
	}
	static int8_t
	sbyte1(intptr_t ea)
	{
		return *(int8_t*)(ea);
	}

	// word
	static uint16_t
	uint2(intptr_t ea)
	{
		return *(uint16_t*)(ea);
	}
	static int16_t
	sint2(intptr_t ea)
	{
		return *(int16_t*)(ea);
	}

	// dword
	static uint32_t
	uint4(intptr_t ea)
	{
		return *(uint32_t*)(ea);
	}
	static int32_t
	sint4(intptr_t ea)
	{
		return *(int32_t*)(ea);
	}

	// qword
	static uint64_t
	uint8(intptr_t ea)
	{
		return *(uint64_t*)(ea);
	}

	static int64_t
	sint8(intptr_t ea)
	{
		return *(int64_t*)(ea);
	}

	// floating-point
	static float
	binary32(intptr_t ea)
	{
		return *(float*)(ea);
	}

	static double
	binary64(intptr_t ea)
	{
		return *(double*)(ea);
	}

	// platform specific calls
	static intptr_t
	getProcessEnvironmentBlock()
	{
		static ndk::PNtQueryInformationProcess NtQueryInformationProcess = NULL;

		NTSTATUS notok; ULONG dwLength;
		HANDLE hProcess;
		PROCESS_BASIC_INFORMATION info;

		if (NtQueryInformationProcess == NULL) {
			HMODULE hNtDll = LoadLibrary(L"ntdll.dll");
			if (hNtDll == NULL)
				return (intptr_t)0;

			NtQueryInformationProcess = reinterpret_cast<decltype(NtQueryInformationProcess)>(GetProcAddress(hNtDll, "NtQueryInformationProcess"));
			if (NtQueryInformationProcess == NULL)
				return (intptr_t)0;
		}

		hProcess = ::GetCurrentProcess();

		memset(&info, 0, sizeof(info));
		notok = NtQueryInformationProcess(hProcess, ProcessBasicInformation, &info, sizeof(info), &dwLength);
		if (notok || dwLength < offsetof(PROCESS_BASIC_INFORMATION, PebBaseAddress) + sizeof(info.PebBaseAddress))
			return (intptr_t)0;
		return (intptr_t)info.PebBaseAddress;
	}

	static intptr_t
	getThreadEnvironmentBlock(DWORD dwTid)
	{
		static ndk::PNtQueryInformationThread NtQueryInformationThread = NULL;

		NTSTATUS notok; ULONG dwLength;
		HANDLE hThread;
		ndk::THREAD_BASIC_INFORMATION info;

		if (NtQueryInformationThread == NULL) {
			HMODULE hNtDll = LoadLibrary(L"ntdll.dll");
			if (hNtDll == NULL)
				return (intptr_t)0;

			NtQueryInformationThread = reinterpret_cast<decltype(NtQueryInformationThread)>(GetProcAddress(hNtDll, "NtQueryInformationThread"));
			if (NtQueryInformationThread == NULL)
				return (intptr_t)0;
		}

		memset(&info, 0, sizeof(info));

		if (dwTid == 0)
			dwTid = ::GetCurrentThreadId();

		hThread = ::OpenThread(THREAD_QUERY_INFORMATION, FALSE, dwTid);
		notok = NtQueryInformationThread(hThread, (::THREADINFOCLASS)ndk::ThreadBasicInformation, &info, sizeof(info), &dwLength);
		CloseHandle(hThread);

		if (notok || dwLength < offsetof(ndk::THREAD_BASIC_INFORMATION, TebBaseAddress) + sizeof(info.TebBaseAddress))
			return (intptr_t)0;
		return (intptr_t)info.TebBaseAddress;
	}

	static DWORD
	getLastError()
	{
		return ::GetLastError();
	}

	static void
	setLastError(DWORD code)
	{
		::SetLastErrorEx(code, 0);
	}

	static DWORD
	getLastErrorString(DWORD code, wchar_t** string)
	{
		int res;
		wchar_t* p;
		DWORD err;

		res = ::FormatMessage(
			FORMAT_MESSAGE_ALLOCATE_BUFFER|FORMAT_MESSAGE_FROM_SYSTEM,
			0,
			code,
			0,
			(LPWSTR)(&p),	//wchar_t**
			0,
			NULL
		);
		err = ::GetLastError();

		if (res) {
			if (err == ERROR_SUCCESS)
				*string = ::_wcsdup(p);
			(HLOCAL)LocalFree(p);
		} else
			*string = NULL;

		return err;
	}

	static DWORD
	queryAddress(intptr_t ea, MEMORY_BASIC_INFORMATION32* result)
	{
		const HANDLE hProcess = ::GetCurrentProcess();
		SIZE_T cb;
		MEMORY_BASIC_INFORMATION32 mbi;

		if (result == NULL)
			return ERROR_INVALID_PARAMETER;

		cb = ::VirtualQueryEx(hProcess, (LPCVOID)ea, (PMEMORY_BASIC_INFORMATION)&mbi, sizeof(mbi));
		if (cb == 0 || cb != sizeof(*result))
			return (cb == 0)? ::GetLastError() : ERROR_INVALID_PARAMETER;

		memcpy(result, &mbi, sizeof(*result));
		return ERROR_SUCCESS;
	}

	static DWORD
	queryAddress(intptr_t ea, MEMORY_BASIC_INFORMATION64* result)
	{
		const HANDLE hProcess = ::GetCurrentProcess();
		SIZE_T cb;
		MEMORY_BASIC_INFORMATION64 mbi;

		if (result == NULL)
			return ERROR_INVALID_PARAMETER;

		cb = ::VirtualQueryEx(hProcess, (LPCVOID)ea, (PMEMORY_BASIC_INFORMATION)&mbi, sizeof(mbi));
		if (cb == 0 || cb != sizeof(*result))
			return (cb == 0)? ::GetLastError() : ERROR_INVALID_PARAMETER;

		memcpy(result, &mbi, sizeof(*result));
		return ERROR_SUCCESS;
	}
}

/** CLeaker implementation */
STDMETHODIMP CLeaker::breakpoint()
{
	::DebugBreak();
	return S_OK;
}

/* CLeaker disassembler and dumper */
STDMETHODIMP CLeaker::get_syntax(BSTR* pVal)
{
	auto bstrSyntax = _com_util::ConvertStringToBSTR(utils::OptionToSyntax(disasm.m_syntax));
	if (bstrSyntax == NULL)
		return S_FALSE;

	*pVal = bstrSyntax;
	return S_OK;
}

STDMETHODIMP CLeaker::put_syntax(BSTR newVal)
{
	auto syntax = _com_util::ConvertBSTRToString(newVal);
	auto res = S_OK;

	if (syntax == NULL)
		return S_FALSE;

	try {
		(cs_opt_value)disasm.syntax(utils::SyntaxToOption(syntax));
	}
	catch (...) {
		res = S_FALSE;
	}

	delete[] syntax;
	return res;
}

STDMETHODIMP CLeaker::get_bits(ULONG* pVal)
{
	*pVal = disasm.m_bits;
	return S_OK;
}

STDMETHODIMP CLeaker::put_bits(ULONG newVal)
{
	try {
		(size_t)disasm.bits(newVal);
	}
	catch (...) {
		return S_FALSE;
	}
	return S_OK;
}

STDMETHODIMP CLeaker::disassemble(ULONGLONG ea, ULONG n, BSTR* result)
{
	std::stringstream os;
	intptr_t p = static_cast<intptr_t>(ea);

	try {
		if (disasm.disasm(p, n, os) != static_cast<size_t>(n))
			return S_FALSE;
	}
	catch (...) {
		utils::setLastError(STATUS_ACCESS_VIOLATION);
		return S_FALSE;
	}

	auto bstr = _com_util::ConvertStringToBSTR(os.str().c_str());
	if (bstr == NULL)
		return S_FALSE;

	*result = bstr;
	return S_OK;
}

STDMETHODIMP CLeaker::dump(ULONGLONG ea, ULONG n, BSTR type, BSTR* result)
{
	std::stringstream os;
	intptr_t p = static_cast<intptr_t>(ea);

	// figure out what type the user wants
	auto tempstr = _com_util::ConvertBSTRToString(type);
	if (tempstr == NULL)
		return S_FALSE;
	std::string typestr(tempstr);
	delete[] tempstr;

	// dump it to the stringstream
	Dumper::dumptype dumper = utils::CstringToDumptype(typestr);
	Dumper d(disasm.m_bits, 16);

	try {
		(d.*dumper)(p, n, os);
	}
	catch (...) {
		utils::setLastError(STATUS_ACCESS_VIOLATION);
		return S_FALSE;
	}

	// render the stringstream and then return it
	auto bstr = _com_util::ConvertStringToBSTR(os.str().c_str());
	if (bstr == NULL)
		return S_FALSE;
	*result = bstr;
	return S_OK;
}


/* CLeaker integer extraction */
STDMETHODIMP CLeaker::uint8_t(ULONGLONG ea, ULONGLONG* result)
{
	intptr_t p = static_cast<intptr_t>(ea);
	try {
		auto res = utils::ubyte1(p);
		*result = static_cast<ULONG>(res);
	}
	catch (...) {
		utils::setLastError(STATUS_ACCESS_VIOLATION);
		return S_FALSE;
	}
	return S_OK;
}

STDMETHODIMP CLeaker::sint8_t(ULONGLONG ea, LONGLONG* result)
{
	intptr_t p = static_cast<intptr_t>(ea);

	try {
		auto res = utils::sbyte1(p);
		*result = static_cast<LONG>(res);
	}
	catch (...) {
		utils::setLastError(STATUS_ACCESS_VIOLATION);
		return S_FALSE;
	}
	return S_OK;
}

STDMETHODIMP CLeaker::uint16_t(ULONGLONG ea, ULONGLONG* result)
{
	intptr_t p = static_cast<intptr_t>(ea);
	try {
		auto res = utils::uint2(p);
		*result = static_cast<ULONG>(res);
	}
	catch (...) {
		utils::setLastError(STATUS_ACCESS_VIOLATION);
		return S_FALSE;
	}
	return S_OK;
}

STDMETHODIMP CLeaker::sint16_t(ULONGLONG ea, LONGLONG* result)
{
	intptr_t p = static_cast<intptr_t>(ea);
	try {
		auto res = utils::sint2(p);
		*result = static_cast<LONG>(res);
	}
	catch (...) {
		utils::setLastError(STATUS_ACCESS_VIOLATION);
		return S_FALSE;
	}
	return S_OK;
}

STDMETHODIMP CLeaker::uint32_t(ULONGLONG ea, ULONGLONG* result)
{
	intptr_t p = static_cast<intptr_t>(ea);
	try {
		auto res = utils::uint4(p);
		*result = static_cast<ULONG>(res);
	}
	catch (...) {
		utils::setLastError(STATUS_ACCESS_VIOLATION);
		return S_FALSE;
	}
	return S_OK;
}

STDMETHODIMP CLeaker::sint32_t(ULONGLONG ea, LONGLONG* result)
{
	intptr_t p = static_cast<intptr_t>(ea);
	try {
		auto res = utils::sint4(p);
		*result = static_cast<LONG>(res);
	}
	catch (...) {
		utils::setLastError(STATUS_ACCESS_VIOLATION);
		return S_FALSE;
	}
	return S_OK;
}

STDMETHODIMP CLeaker::uint64_t(ULONGLONG ea, ULONGLONG* result)
{
	intptr_t p = static_cast<intptr_t>(ea);
	try {
		auto res = utils::uint8(p);
		*result = static_cast<ULONG>(res);
	}
	catch (...) {
		utils::setLastError(STATUS_ACCESS_VIOLATION);
		return S_FALSE;
	}
	return S_OK;
}

STDMETHODIMP CLeaker::sint64_t(ULONGLONG ea, LONGLONG* result)
{
	intptr_t p = static_cast<intptr_t>(ea);
	try {
		auto res = utils::sint8(p);
		*result = static_cast<LONG>(res);
	}
	catch (...) {
		utils::setLastError(STATUS_ACCESS_VIOLATION);
		return S_FALSE;
	}
	return S_OK;
}

STDMETHODIMP CLeaker::binary32(ULONGLONG ea, FLOAT* result)
{
	intptr_t p = static_cast<intptr_t>(ea);
	try {
		auto res = utils::binary32(p);
		*result = static_cast<FLOAT>(res);
	}
	catch (...) {
		utils::setLastError(STATUS_ACCESS_VIOLATION);
		return S_FALSE;
	}
	return S_OK;
}

STDMETHODIMP CLeaker::binary64(ULONGLONG ea, DOUBLE* result)
{
	intptr_t p = static_cast<intptr_t>(ea);
	try {
		auto res = utils::binary64(p);
		*result = static_cast<DOUBLE>(res);
	}
	catch (...) {
		utils::setLastError(STATUS_ACCESS_VIOLATION);
		return S_FALSE;
	}
	return S_OK;
}

/* CLeaker string extraction */
STDMETHODIMP CLeaker::unicodestring(ULONGLONG ea, BSTR* result)
{
	std::wstring wstr;
	intptr_t p = static_cast<intptr_t>(ea);
	PUNICODE_STRING us = reinterpret_cast<PUNICODE_STRING>(p);

	// convert UNICODE_STRING to an std::wstring
	try {
		wstr.assign(us->Buffer, us->Length);
	}
	catch (...) {
		utils::setLastError(STATUS_ACCESS_VIOLATION);
		return S_FALSE;
	}

	// convert std::wstring to a BSTR
	auto bstr = ::SysAllocString(wstr.c_str());
	if (bstr == NULL)
		return S_FALSE;

	*result = bstr;
	return S_OK;
}

STDMETHODIMP CLeaker::ansistring(ULONGLONG ea, BSTR* result)
{
	std::string str;
	intptr_t p = static_cast<intptr_t>(ea);
	PANSI_STRING as = reinterpret_cast<PANSI_STRING>(p);

	// convert ANSI_STRING to an std::string
	try {
		str.assign(as->Buffer, as->Length);
	}
	catch (...) {
		utils::setLastError(STATUS_ACCESS_VIOLATION);
		return S_FALSE;
	}

	// convert std::string to a BSTR
	auto bstr = _com_util::ConvertStringToBSTR(str.c_str());
	if (bstr == NULL)
		return S_FALSE;

	*result = bstr;
	return S_OK;
}

/* CLeaker NDK wrappers */
STDMETHODIMP CLeaker::Peb(ULONGLONG* PebBaseAddress)
{
	auto res = utils::getProcessEnvironmentBlock();
	*PebBaseAddress = static_cast<ULONGLONG>(res);
	return S_OK;
}

STDMETHODIMP CLeaker::Teb(ULONG dwThreadId, ULONGLONG* TebBaseAddress)
{
	dwThreadId = ::GetCurrentThreadId();
	auto res = utils::getThreadEnvironmentBlock(dwThreadId);
	*TebBaseAddress = static_cast<ULONGLONG>(res);
	return S_OK;
}

STDMETHODIMP CLeaker::getlasterror(ULONG* dwErrorCode)
{
	auto result = utils::getLastError();
	*dwErrorCode = static_cast<LONG>(result);
	return S_OK;
}

STDMETHODIMP CLeaker::geterrormessage(ULONG dwErrorCode, BSTR* bstrErrorMessage)
{
	wchar_t* wstr;
	auto err = utils::getLastErrorString(static_cast<DWORD>(dwErrorCode), &wstr);
	if (err != ERROR_SUCCESS)
		return S_FALSE;

	auto bstrResult = ::SysAllocString(wstr);
	free(wstr);

	if (bstrResult == NULL)
		return S_FALSE;

	*bstrErrorMessage = bstrResult;
	return S_OK;
}

/* CLeaker VirtualQuery wrappers */
STDMETHODIMP CLeaker::mem_baseaddress(ULONGLONG ea, ULONGLONG* result)
{
	const auto bits = disasm.m_bits;
	DWORD res;
	MEMORY_BASIC_INFORMATION32 mbi32;
	MEMORY_BASIC_INFORMATION64 mbi64;
	
	if (bits == 64)
		res = utils::queryAddress(static_cast<intptr_t>(ea), &mbi64);
	else if (bits == 32)
		res = utils::queryAddress(static_cast<intptr_t>(ea), &mbi32);
	else
		res = ERROR_INVALID_PARAMETER;

	if (res != ERROR_SUCCESS) {
		::SetLastError(res);
		return S_FALSE;
	}

	*result = (bits == 64)? mbi64.AllocationBase : mbi32.AllocationBase;
	return S_OK;
}


STDMETHODIMP CLeaker::mem_size(ULONGLONG ea, ULONGLONG* result)
{
	const auto bits = disasm.m_bits;
	DWORD res;
	MEMORY_BASIC_INFORMATION32 mbi32;
	MEMORY_BASIC_INFORMATION64 mbi64;

	if (bits == 64)
		res = utils::queryAddress(static_cast<intptr_t>(ea), &mbi64);
	else if (bits == 32)
		res = utils::queryAddress(static_cast<intptr_t>(ea), &mbi32);
	else
		res = ERROR_INVALID_PARAMETER;

	if (res != ERROR_SUCCESS) {
		::SetLastError(res);
		return S_FALSE;
	}

	*result = (bits == 64)? mbi64.RegionSize : mbi32.RegionSize;
	return S_OK;
}


STDMETHODIMP CLeaker::mem_state(ULONGLONG ea, ULONGLONG* result)
{
	const auto bits = disasm.m_bits;
	DWORD res;
	MEMORY_BASIC_INFORMATION32 mbi32;
	MEMORY_BASIC_INFORMATION64 mbi64;

	if (bits == 64)
		res = utils::queryAddress(static_cast<intptr_t>(ea), &mbi64);
	else if (bits == 32)
		res = utils::queryAddress(static_cast<intptr_t>(ea), &mbi32);
	else
		res = ERROR_INVALID_PARAMETER;

	if (res != ERROR_SUCCESS) {
		::SetLastError(res);
		return S_FALSE;
	}

	*result = (bits == 64)? mbi64.State : mbi32.State;
	return S_OK;
}


STDMETHODIMP CLeaker::mem_protect(ULONGLONG ea, ULONGLONG* result)
{
	const auto bits = disasm.m_bits;
	DWORD res;
	MEMORY_BASIC_INFORMATION32 mbi32;
	MEMORY_BASIC_INFORMATION64 mbi64;

	if (bits == 64)
		res = utils::queryAddress(static_cast<intptr_t>(ea), &mbi64);
	else if (bits == 32)
		res = utils::queryAddress(static_cast<intptr_t>(ea), &mbi32);
	else
		res = ERROR_INVALID_PARAMETER;

	if (res != ERROR_SUCCESS) {
		::SetLastError(res);
		return S_FALSE;
	}

	*result = (bits == 64)? mbi64.Protect : mbi32.Protect;
	return S_OK;
}

STDMETHODIMP CLeaker::mem_type(ULONGLONG ea, ULONGLONG* result)
{
	const auto bits = disasm.m_bits;
	DWORD res;
	MEMORY_BASIC_INFORMATION32 mbi32;
	MEMORY_BASIC_INFORMATION64 mbi64;

	if (bits == 64)
		res = utils::queryAddress(static_cast<intptr_t>(ea), &mbi64);
	else if (bits == 32)
		res = utils::queryAddress(static_cast<intptr_t>(ea), &mbi32);
	else
		res = ERROR_INVALID_PARAMETER;

	if (res != ERROR_SUCCESS) {
		::SetLastError(res);
		return S_FALSE;
	}

	*result = (bits == 64)? mbi64.Type : mbi32.Type;
	return S_OK;
}

/*
	TODO:
		Enumerate thread IDs. Figure out how to return an array or an object from ActiveX.
*/

STDMETHODIMP CLeaker::store(ULONGLONG ea, ULONG n, ULONGLONG value, ULONGLONG* result)
{
	intptr_t p = static_cast<intptr_t>(ea);

	union {
		std::uint8_t res1; std::uint16_t res2;
		std::uint32_t res4; std::uint64_t res8;
	};
	union {
		std::uint8_t* p1; std::uint16_t* p2;
		std::uint32_t* p4; std::uint64_t* p8;
	};

	try {
		switch (n) {
		case 1:
			p1 = reinterpret_cast<std::uint8_t*>(p);
			res1 = *p1;
			*p1 = value & 0xff;
			*result = static_cast<ULONGLONG>(res1);
			break;

		case 2:
			p2 = reinterpret_cast<std::uint16_t*>(p);
			res2 = *p2;
			*p2 = value & 0xffff;
			*result = static_cast<ULONGLONG>(res2);
			break;

		case 4:
			p4 = reinterpret_cast<std::uint32_t*>(p);
			res4 = *p4;
			*p4 = value & 0xffffffff;
			*result = static_cast<ULONGLONG>(res4);
			break;

		case 8:
			p8 = reinterpret_cast<std::uint64_t*>(p);
			res8 = *p8;
			*p8 = value & 0xffffffffffffffff;
			*result = static_cast<ULONGLONG>(res8);
			break;

		default:
			utils::setLastError(STATUS_INVALID_PARAMETER);
			return S_FALSE;
		}
	}
	catch (...) {
		utils::setLastError(STATUS_ACCESS_VIOLATION);
		return S_FALSE;
	}
	return S_OK;
}
