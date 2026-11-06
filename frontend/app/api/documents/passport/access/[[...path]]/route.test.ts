import { GET, PUT, DELETE } from './route';
import { getServerAuthSession } from '@/core/auth';
import { fetchBackendAsUser } from '@/shared/api/backend/server';
vi.mock('@/core/auth',()=>({getServerAuthSession:vi.fn()}));
vi.mock('@/shared/api/backend/server',()=>({fetchBackendAsUser:vi.fn()}));
beforeEach(()=>{vi.clearAllMocks();vi.mocked(getServerAuthSession).mockResolvedValue({user:{id:'owner'}} as never);});
it('requires a session before reading or changing grants',async()=>{
 vi.mocked(getServerAuthSession).mockResolvedValue(null);
 for(const handler of [GET,PUT,DELETE]) expect((await handler(new Request('http://localhost/api'),{params:Promise.resolve({})})).status).toBe(401);
 expect(fetchBackendAsUser).not.toHaveBeenCalled();
});
it('forwards explicit kinds and duration as the session owner with no-store',async()=>{
 vi.mocked(fetchBackendAsUser).mockResolvedValue(Response.json({ok:true}));
 const body={form:false,photo:true,durationDays:7};
 const response=await PUT(new Request('http://localhost/api',{method:'PUT',body:JSON.stringify(body)}),{params:Promise.resolve({path:['request-1']})});
 expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('private, no-store');
 expect(fetchBackendAsUser).toHaveBeenCalledWith('/documents/passport/access/request-1','owner',expect.objectContaining({method:'PUT',body:JSON.stringify(body),cache:'no-store'}));
});
it('preserves server denials without claiming success',async()=>{
 vi.mocked(fetchBackendAsUser).mockResolvedValue(Response.json({message:'Denied'},{status:403}));
 const response=await DELETE(new Request('http://localhost/api',{method:'DELETE'}),{params:Promise.resolve({path:['request-1','PHOTO']})});
 expect(response.status).toBe(403);expect(await response.json()).toEqual({message:'Denied'});
});
