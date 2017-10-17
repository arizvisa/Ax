// Leaker.h : Declaration of the CLeaker
#pragma once
#include "resource.h"       // main symbols
#include <atlctl.h>
#include "Ax_i.h"

#include "disassembler.h"

#if defined(_WIN32_WCE) && !defined(_CE_DCOM) && !defined(_CE_ALLOW_SINGLE_THREADED_OBJECTS_IN_MTA)
#error "Single-threaded COM objects are not properly supported on Windows CE platform, such as the Windows Mobile platforms that do not include full DCOM support. Define _CE_ALLOW_SINGLE_THREADED_OBJECTS_IN_MTA to force ATL to support creating single-thread COM object's and allow use of it's single-threaded COM object implementations. The threading model in your rgs file was set to 'Free' as that is the only threading model supported in non DCOM Windows CE platforms."
#endif

using namespace ATL;

// CLeaker
class ATL_NO_VTABLE CLeaker :
	public CComObjectRootEx<CComSingleThreadModel>,
	public IDispatchImpl<ILeaker, &IID_ILeaker, &LIBID_AxLib, /*wMajor =*/ 1, /*wMinor =*/ 0>,
	public IOleControlImpl<CLeaker>,
	public IOleObjectImpl<CLeaker>,
	public IOleInPlaceActiveObjectImpl<CLeaker>,
	public IViewObjectExImpl<CLeaker>,
	public IOleInPlaceObjectWindowlessImpl<CLeaker>,
	public IObjectSafetyImpl<CLeaker, INTERFACESAFE_FOR_UNTRUSTED_CALLER>,
	public CComCoClass<CLeaker, &CLSID_Leaker>,
	public CComControl<CLeaker>
{
private:
	Disassembler disasm;

public:
	CLeaker()
		: disasm()
	{
	}

DECLARE_OLEMISC_STATUS(OLEMISC_RECOMPOSEONRESIZE |
	OLEMISC_INVISIBLEATRUNTIME |
	OLEMISC_CANTLINKINSIDE |
	OLEMISC_INSIDEOUT |
	OLEMISC_ACTIVATEWHENVISIBLE |
	OLEMISC_SETCLIENTSITEFIRST
)

DECLARE_REGISTRY_RESOURCEID(IDR_LEAKER)


DECLARE_NOT_AGGREGATABLE(CLeaker)

BEGIN_COM_MAP(CLeaker)
	COM_INTERFACE_ENTRY(ILeaker)
	COM_INTERFACE_ENTRY(IDispatch)
	COM_INTERFACE_ENTRY(IViewObjectEx)
	COM_INTERFACE_ENTRY(IViewObject2)
	COM_INTERFACE_ENTRY(IViewObject)
	COM_INTERFACE_ENTRY(IOleInPlaceObjectWindowless)
	COM_INTERFACE_ENTRY(IOleInPlaceObject)
	COM_INTERFACE_ENTRY2(IOleWindow, IOleInPlaceObjectWindowless)
	COM_INTERFACE_ENTRY(IOleInPlaceActiveObject)
	COM_INTERFACE_ENTRY(IOleControl)
	COM_INTERFACE_ENTRY(IOleObject)
	COM_INTERFACE_ENTRY_IID(IID_IObjectSafety, IObjectSafety)
END_COM_MAP()

BEGIN_PROP_MAP(CLeaker)
	PROP_DATA_ENTRY("_cx", m_sizeExtent.cx, VT_UI4)
	PROP_DATA_ENTRY("_cy", m_sizeExtent.cy, VT_UI4)
	// Example entries
	// PROP_ENTRY_TYPE("Property Name", dispid, clsid, vtType)
	// PROP_PAGE(CLSID_StockColorPage)
END_PROP_MAP()


BEGIN_MSG_MAP(CLeaker)
	CHAIN_MSG_MAP(CComControl<CLeaker>)
	DEFAULT_REFLECTION_HANDLER()
END_MSG_MAP()
// Handler prototypes:
//  LRESULT MessageHandler(UINT uMsg, WPARAM wParam, LPARAM lParam, BOOL& bHandled);
//  LRESULT CommandHandler(WORD wNotifyCode, WORD wID, HWND hWndCtl, BOOL& bHandled);
//  LRESULT NotifyHandler(int idCtrl, LPNMHDR pnmh, BOOL& bHandled);

// IViewObjectEx
	DECLARE_VIEW_STATUS(0)

// ILeaker
public:
	HRESULT OnDrawAdvanced(ATL_DRAWINFO& di)
	{
		return S_OK;
	}


	DECLARE_PROTECT_FINAL_CONSTRUCT()

	HRESULT FinalConstruct()
	{
		return S_OK;
	}

	void FinalRelease()
	{
	}

	STDMETHOD(breakpoint)();

	STDMETHOD(get_syntax)(BSTR* pVal);
	STDMETHOD(put_syntax)(BSTR newVal);
	STDMETHOD(get_bits)(LONG* pVal);
	STDMETHOD(put_bits)(LONG newVal);
	STDMETHOD(disassemble)(ULONGLONG ea, LONG n, BSTR* result);
	STDMETHOD(dump)(ULONGLONG ea, LONG n, BSTR type, BSTR* result);

	STDMETHOD(uint8_t)(ULONGLONG ea, ULONG* result);
	STDMETHOD(sint8_t)(ULONGLONG ea, LONG* result);
	STDMETHOD(uint16_t)(ULONGLONG ea, ULONG* result);
	STDMETHOD(sint16_t)(ULONGLONG ea, LONG* result);
	STDMETHOD(uint32_t)(ULONGLONG ea, ULONG* result);
	STDMETHOD(sint32_t)(ULONGLONG ea, LONG* result);
	STDMETHOD(uint64_t)(ULONGLONG ea, ULONG* result);
	STDMETHOD(sint64_t)(ULONGLONG ea, LONG* result);
	STDMETHOD(binary32)(ULONGLONG ea, FLOAT* result);
	STDMETHOD(binary64)(ULONGLONG ea, DOUBLE* result);
	STDMETHOD(unicodestring)(ULONGLONG ea, BSTR* result);
	STDMETHOD(ansistring)(ULONGLONG ea, BSTR* result);

	STDMETHOD(getPeb)(ULONGLONG* PebBaseAddress);
	STDMETHOD(getTeb)(ULONG dwThreadId, ULONGLONG* TebBaseAddress);
	STDMETHOD(getlasterror)(ULONG* dwErrorCode);
	STDMETHOD(geterrormessage)(ULONG dwErrorCode, BSTR* bstrErrorMessage);

	STDMETHOD(mem_baseaddress)(ULONGLONG ea, ULONGLONG* result);
	STDMETHOD(mem_size)(ULONGLONG ea, ULONGLONG* result);
	STDMETHOD(mem_state)(ULONGLONG ea, ULONGLONG* result);
	STDMETHOD(mem_protect)(ULONGLONG ea, ULONGLONG* result);
	STDMETHOD(mem_type)(ULONGLONG ea, ULONGLONG* result);
};

OBJECT_ENTRY_AUTO(__uuidof(Leaker), CLeaker)
