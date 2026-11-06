import { GET } from './route';
import { getServerAuthSession } from '@/core/auth';
import { fetchBackendAsUser } from '@/shared/api/backend/server';
vi.mock('@/core/auth',()=>({getServerAuthSession:vi.fn()}));
vi.mock('@/shared/api/backend/server',()=>({fetchBackendAsUser:vi.fn()}));
const context={params:Promise.resolve({id:'request-1',photoId:'photo-1'})};
beforeEach(()=>{vi.clearAllMocks();vi.mocked(getServerAuthSession).mockResolvedValue({user:{id:'provider-user'}} as never);});
it('streams authorized bytes without caching or exposing the S3 URL',async()=>{
 vi.mocked(fetchBackendAsUser).mockResolvedValue(new Response(new Uint8Array([1,2,3]),{headers:{'Content-Type':'image/png'}}));
 const response=await GET(new Request('http://localhost/api'),context);
 expect(Array.from(new Uint8Array(await response.arrayBuffer()))).toEqual([1,2,3]);
 expect(response.headers.get('cache-control')).toBe('private, no-store');
 expect(response.headers.get('x-content-type-options')).toBe('nosniff');
 expect(fetchBackendAsUser).toHaveBeenCalledWith('/pro/requests/request-1/passport/photos/photo-1','provider-user',{cache:'no-store'});
});
it('does not stream bytes after access is revoked',async()=>{
 vi.mocked(fetchBackendAsUser).mockResolvedValue(Response.json({message:'Denied'},{status:403}));
 const response=await GET(new Request('http://localhost/api'),context);
 expect(response.status).toBe(403);expect(response.headers.get('content-type')).toContain('application/json');
});
