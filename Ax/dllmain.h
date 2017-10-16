// dllmain.h : Declaration of module class.

class CAxModule : public ATL::CAtlDllModuleT< CAxModule >
{
public :
	DECLARE_LIBID(LIBID_AxLib)
	DECLARE_REGISTRY_APPID_RESOURCEID(IDR_AX, "{1E7D7F80-B39A-4471-A645-98389542F39A}")
};

extern class CAxModule _AtlModule;
