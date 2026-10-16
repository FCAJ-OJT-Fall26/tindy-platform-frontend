# Tindy frontend — STEP 07–08

## Scope và nguồn contract

Triển khai Google/GitHub sign-in, callback exchange, explicit account linking/unlinking, thống nhất logout và auth/onboarding guards. Giữ React 19, React Router 8, Vite 8, Tailwind v4, localStorage JWT key `tindy_access_token`, store hiện có và 8 bước onboarding. Không thêm dependency, refresh token, cookie session, forgot-password API hay account merge.

Source chuẩn: [backend frontend contract](../../../tindy-backend-platform/docs/guide/OAUTH_STEP07_08_FRONTEND_CONTRACT.md). Từ frontend repository, file backend thực tế ở `../tindy-backend-platform/docs/guide/OAUTH_STEP07_08_FRONTEND_CONTRACT.md`. Các response JSON đã khớp `success/message/data`; OAuth metadata `email`, `university`, `username` nullable. Backend và migrations không được chỉnh trong lượt triển khai frontend.

Audit ban đầu: working tree frontend sạch; login/register/onboarding/catalog đã tích hợp; social buttons còn demo, thiếu callback route và route guards, Settings logout chỉ điều hướng, proxy còn HTTP 5217, và các field nullable chưa đúng. Giữ layout, branding, animation, local forms, catalog và các business routes hiện có. Xóa nhãn authentication demo sai; không thay đổi các phần business prototype chưa tích hợp.

## File thay đổi

| File | Lý do |
| --- | --- |
| `src/services/apiConfig.ts` (mới) | Chung API base URL cho fetch và browser navigation; kiểm tra origin/scheme cấu hình |
| `src/services/apiClient.ts` | Bearer, timeout 15 giây, no-store/no-referrer/omit credentials; đồng bộ session-expired và onboarding-required với store; không logout vì invalid link ticket; bỏ qua lỗi JWT từ request của token cũ |
| `src/services/authValidation.ts` (mới) | Validate runtime user/session trước khi nhận đăng nhập; whitelist redirect theo onboarding; thông báo auth an toàn |
| `src/services/auth.service.ts` | Validate register/login trước khi lưu token, validate `/me`, hỗ trợ abort, logout không gọi API khi không có token và luôn cleanup |
| `src/services/oauth.service.ts` (mới), `src/services/index.ts` | OAuth exchange, connections list/start/confirm/delete; kiểm tra authorization URL và link context chỉ chứa UserId/thời điểm |
| `src/services/oauthCallback.ts` (mới), `src/main.tsx` | Đọc rồi xóa fragment/query trước render/API; một operation cho mỗi callback attempt, không ghi ticket vào storage/history state |
| `src/types/auth.ts` | Nullable metadata và DTO OAuth provider/connections/confirmation |
| `src/pages/auth/AuthScreen.tsx` | Giữ form/style/animation; social navigation thật, session hợp lệ đi đúng route, dùng validated session và safe errors |
| `src/pages/auth/OAuthCallbackScreen.tsx` (mới) | Callback login/link riêng biệt, StrictMode deduplication, ticket mới sau lỗi, không commit response khi component đã rời đi/session đổi |
| `src/components/auth/RequireAuth.tsx` (mới), `src/App.tsx` | Auth/onboarding guards; settings cho active user chưa onboarding; legal/auth/callback public |
| `src/components/auth/ConnectedAccounts.tsx` (mới) | Trạng thái backend, connect/disconnect/confirmation/loading/retry/409; refresh sau callback và unlink |
| `src/pages/settings/SettingsScreen.tsx`, `src/components/layout/Sidebar.tsx` | Cùng store logout, disable khi pending, navigation replace; giữ các section/preferences hiện có |
| `src/store.tsx` | Một auth state; phục hồi `/me`, chặn stale restore sau logout, nullable profile không lấy thông tin user cũ, đồng bộ lỗi phiên, cleanup profile/toast thuộc phiên |
| `src/pages/onboarding/OnboardingScreen.tsx` | Một dòng đồng bộ completed flag từ progress backend trước redirect; không đổi business logic/form/catalog của 8 bước |
| `vite.config.ts`, `.env.example` (mới), `.gitignore` | HTTPS dev API 7190; cho phép commit example không chứa secret |
| `tests/auth.browser.mjs` (mới), `package.json` | Browser regression qua backend HTTP stand-in, không thêm packages; script `test:auth` |
| `tests/onboarding.browser.mjs` | Giữ 41 checks; explicit test API origin, login anonymous, expectation 401 theo guard mới, chờ independent category retry và kiểm tra đường dẫn cleanup temp profile |
| Tài liệu này (mới) | Handoff, security review, manual checklist và giới hạn kiểm chứng |

## API integrations và flow thực tế

Success `{ "success": true, "message": "...", "data": ... }`; lỗi ProblemDetails với `error_code`. Không suy identity từ email, không tự tạo endpoints hoặc giả lập auth thành công trong application code. Mocks chỉ ở tests.

| Endpoint | Frontend sử dụng |
| --- | --- |
| `POST /api/auth/register` | Form register hiện có; public JSON, validate session trước lưu JWT |
| `POST /api/auth/login` | Form login email/username; public JSON, redirect validated |
| `GET /api/auth/google`, `/api/auth/github` | `window.location.assign` đến backend, không fetch OAuth challenge |
| `POST /api/auth/oauth/exchange` | Public JSON `{ "ticket": "..." }`; nhận Tindy JWT trong response body |
| `GET /api/me` | Bearer; phục hồi phiên sau refresh, nullable metadata |
| `GET /api/auth/connections` | Bearer; dùng `has_local_password`, `providers`, `provider_username`, `linked_at` từ backend |
| `POST /api/auth/connections/{google|github}/start` | Bearer; validate và navigate `data.authorization_url` |
| `POST /api/auth/connections/confirm` | Bearer của user đã start; `{ "link_ticket": "..." }`; không đổi JWT/UserId |
| `DELETE /api/auth/connections/{google|github}` | Bearer, confirmation trước request; refresh snapshot sau thành công |
| `POST /api/auth/logout` | Bearer khi có token; client cleanup kể cả API lỗi |

### Login callback

Backend đưa browser về `/auth/oauth/callback#ticket=...`. `main.tsx` capture vào memory và `history.replaceState` bỏ toàn bộ query/fragment trước React effects, `/me` hoặc exchange. Callback kiểm tra ticket Base64Url 43 ký tự, từ chối callback mơ hồ hoặc field không hợp lệ; POST exchange một lần. Chỉ session đủ field, active user, Bearer token, lifetime dương và redirect phù hợp mới được commit vào storage/store. `is_onboarding_completed=false` đi `/onboarding`, true đi `/discover`; navigation dùng replace.

StrictMode chia sẻ Promise của cùng attempt; effect cleanup bỏ qua kết quả của instance đã unmount. Sau operation, bỏ cả ticket và Promise đã settle để không giữ JWT/user result trong callback cache, kể cả khi đã unmount. Theo dõi router location để ticket mới sau một lỗi vẫn được xử lý. Reload với ticket đã consume trả lỗi backend; không có retry tự động cùng ticket hoặc fallback đăng nhập giả. Query errors chỉ hiển thị nội dung whitelist, luôn bỏ raw query khỏi URL.

### Account linking

Trong Settings → Privacy & security → Connected accounts, Connect gọi endpoint start có Bearer. Chỉ navigate nếu URL cùng API origin, đúng `/api/auth/connections/{provider}/challenge`, không credentials/hash và chỉ có opaque `request` hợp lệ. Lưu `tindy_oauth_link_context` trong sessionStorage gồm **UserId + startedAt**, không JWT/ticket. Marker chỉ dùng trong tab đã start, với cửa sổ UI tối đa 6 phút 30 giây; TTL và quyền confirm cuối cùng vẫn do backend quyết định.

Callback `#link_ticket=...` được làm sạch trước API, chờ `/me` xong, yêu cầu current user khớp marker rồi confirm. Thiếu phiên, đổi tài khoản/tab hoặc marker quá hạn: không confirm và hướng dẫn start lại bằng account gốc. Thành công giữ JWT/UserId, bỏ marker, quay `/settings` và fetch lại connections. `AUTH_INVALID_CREDENTIALS` của link ticket 401 không xóa một JWT còn hợp lệ. Backend vẫn kiểm tra same UserId, one-time ticket và identity ownership.

Disconnect yêu cầu xác nhận, khóa submit đang chạy, hiển thị 409 rõ về phương thức cuối/concurrent change, không logout và reload connections sau thành công. `has_local_password` đến từ backend, không suy từ email. Browser Back khôi phục trang từ bfcache sẽ mở lại controls và reload connections.

### Session, routes, logout

Store tiếp tục là nguồn state duy nhất. Refresh dùng `/me`, không tin JWT chỉ vì có string trong storage. Trong `authLoading`, guard hiển thị trạng thái phục hồi; business routes không render nội dung cho anonymous hoặc user chưa hoàn thành onboarding. `/settings` và onboarding cho user đã đăng nhập; completed user vào onboarding chuyển `/discover`. `/login`, `/register`, `/auth/oauth/callback`, `/privacypolicy`, `/termsofservice` public; auth pages chuyển user đã đăng nhập về route phù hợp.

Protected 401 (trừ link-ticket error), hoặc active-account 403 `AUTH_FORBIDDEN`, xóa token lẫn auth state. 403 `ONBOARDING_REQUIRED` giữ token và cập nhật gate. Stale requests của token cũ không xóa token mới; `/me` chậm không khôi phục user sau logout. Token thay đổi từ tab khác khiến tab hiện tại reload để lấy identity hiện hành.

Sidebar và Settings dùng cùng `logout()`. Một request pending, timeout hữu hạn; token, authUser, toast và profile thuộc phiên được reset trong finally kể cả 401/403/503/network failure. Chỉ reset profile và profile-owner marker của user, không `localStorage.clear()` trong application code; giữ preferences, project state và draft không thuộc phiên. Metadata `tindy-v2-profile-owner` ngăn profile account khác bị dùng làm fallback; null email/university là chuỗi trống khi hiển thị. Legacy profile không có owner không được coi là profile của tài khoản mới. Cùng owner tiếp tục giữ profile draft hiện có.

Logout navigate `/login` với replace. Không revoke JWT server, không logout Google/GitHub và không đổi sang cookie auth. Các form Account/notification preferences có sẵn vẫn giữ hành vi local hiện tại; không có endpoint sửa email mới được tạo.

## Environment, CORS và HTTPS

Merge/copy `.env.example` thành `.env.local` (gitignored), rồi restart Vite:

```dotenv
VITE_API_BASE_URL=https://localhost:7190
```

VITE variables là public build configuration, không để secret/JWT/OAuth client secret vào đây. Không thêm `/api` vào base. Development không có biến dùng HTTPS 7190. Production không có biến dùng cùng origin; chỉ dùng cách này khi frontend và API được phục vụ sau cùng HTTPS origin. Nếu khác origin phải cấu hình API HTTPS của deployment lúc build.

Backend dev CORS và OAuth frontend allowlist cần `http://localhost:8443`; callback dùng entry đầu tiên nên dùng nhất quán localhost. Trình duyệt phải truy cập được certificate HTTPS backend. API requests omit cookies, có Bearer/JSON, cần preflight cho Authorization/Content-Type. Vite proxy `/api` được đổi sang HTTPS 7190, `secure:false` chỉ dành cho proxy dev tới dev certificate. Flow OAuth thật dùng trực tiếp HTTPS API base; không dựa vào proxy HTTP 8443 cho Secure OAuth cookies. HTTP loopback trong API config chỉ được chấp nhận ở Development/test; test fixture dùng HTTP loopback và CORS thật, không chứng minh TLS/cookie provider thật.

## Security review và giới hạn contract

| Finding | Xử lý |
| --- | --- |
| OAuth buttons và Settings logout còn demo | Dùng endpoints backend thật và cùng store logout |
| Ticket có thể tồn tại trong callback URL/effects lặp | Early cleanup, ticket chỉ ở memory, Promise theo attempt, location subscription cho lần thử mới |
| Response thiếu token/user hoặc redirect tùy ý | Runtime validation trước commit; redirect chỉ đúng `/onboarding` hoặc `/discover` |
| Linking nhầm user, identity replacement hoặc open redirect | Marker UserId không chứa credential, đối chiếu current identity, URL origin/path/query validation; không nhận provider identity làm authUser |
| Link ticket 401 làm mất phiên hợp lệ | Phân biệt `AUTH_INVALID_CREDENTIALS` với JWT authorization failure |
| Chỉ clear storage nhưng authUser cũ còn sống | Event đồng bộ store và guards, reset session, chặn stale restore |
| OAuth null metadata dùng thông tin user trước | Owner marker và authoritative nullable metadata; profile user khác không được hiển thị |
| Logout lỗi giữ state, request treo hoặc double submit | Finally cleanup, 15 giây timeout, single pending logout/unlink, replace navigation |
| Arbitrary provider exception detail ra UI | Static safe auth messages, không log/dump ticket, token, response hoặc link URL trong application code |

Rủi ro còn lại theo chính sách được giữ: localStorage đọc được bởi JavaScript nên XSS có thể đánh cắp JWT; không có client-side guard nào thay thế backend authorization. Giữ xử lý nội dung untrusted bằng React escaping, không thêm `dangerouslySetInnerHTML`, không log token hoặc đưa vào telemetry. Third-party scripts/APM/proxy/browser extensions ngoài application không được chứng minh an toàn bằng suite này; nếu thêm analytics sau này phải loại trừ callback/query/fragment nhạy cảm. Stateless logout không vô hiệu hóa token đã sao chép; token còn dùng được đến expiry nếu backend policy cho phép.

Không phát hiện mismatch JSON API còn chặn tích hợp. **Giới hạn đã có trong backend contract:** cancellation/invalid state/correlation do `/signin-google` hoặc `/signin-github` middleware bắt trả 400 ProblemDetails ở backend; không phải mọi provider failure đều redirect về frontend. Frontend xử lý các error redirects đã có, nhưng không thể render error screen riêng khi browser đang đứng tại callback backend 400. Cần kiểm tra UX này bằng provider thật; không tự sửa callback/backend behavior trong scope frontend.

## Verification

Chạy từ frontend root, dùng Node/Chrome đã có; không thêm packages và không gọi provider thật:

```powershell
npm install --ignore-scripts
npm run build
npx tsc --noEmit
npm run test:onboarding
npm run test:auth
git diff --check
git status --short
```

`npm install --ignore-scripts` xác nhận dependency hiện có up to date, không cần chạy lifecycle hooks. Giữ nguyên cả package-lock và pnpm-lock; thay đổi script test không cần cập nhật dependencies/lockfiles. Chrome headless trong sandbox bị timeout ở CDP `Page.enable`; chạy ngoài sandbox cho phép browser tests thực thi. Không dùng browser profile của người dùng: mỗi suite tạo profile tạm riêng và kiểm tra đường dẫn trước khi cleanup.

Auth suite chạy React app thật (bao gồm StrictMode), actual fetch và CORS tới HTTP stand-in. Stand-in được viết từ backend contract trong repository, không tải workspace mock bên ngoài; endpoint chưa định nghĩa trả 501. Kiểm tra Google/GitHub browser navigation, one-time/early-clean callback, failure/new-ticket retry, null metadata, linking/session ownership, confirmation/409/single unlink, session restoration/gates, logout và safe URL/UI/console. Không mock thành công trong application runtime. Onboarding suite giữ catalog/form regression qua CDP interception.

Kết quả thực thi **2026-10-16**, Node **23.11.1**, npm **10.9.2**, Chrome headless cài sẵn:

| Lệnh/kiểm tra | Kết quả thực tế |
| --- | --- |
| `npm install --ignore-scripts` | Pass, dependencies up to date; không thêm package, không đổi lockfiles |
| `npm run build` | Pass, Vite 8.3.2; bundle JS khoảng 630 kB trước gzip |
| `npx tsc --noEmit` | Pass, không lỗi TypeScript |
| `npm run test:onboarding` | Pass, đủ 41 checks hiện có; catalog/forms/validation/8-step completion/mobile |
| `npm run test:auth` | Pass, 58 checks; thực thi cả React StrictMode, HTTP stand-in, CORS/network failure, session và account connections |
| `git diff --check` | Pass |
| Visual QA | Đã xem ảnh Settings desktop/mobile và callback error; không tràn ngang ở viewport mobile 390 px |

Ảnh synthetic fixture ở `.tmp-auth-verification/settings-desktop.png`, `settings-mobile.png`, `oauth-callback-error.png`, `disconnect-conflict.png` (gitignored). Tạo lại bằng cách đặt `VERIFY_SCREENSHOTS_DIR` vào thư mục output rồi chạy `npm run test:auth`. Browser tests chạy ngoài sandbox sau khi sandbox ngăn CDP renderer hoạt động; không có test nào được coi là Pass chỉ từ build.

Build còn cảnh báo không chặn về Vite configLoader native tương lai (`__dirname`, JSON import attributes) và bundle lớn hơn 500 kB; không sửa Figma plugins hoặc tách bundle ngoài phạm vi auth. Không có blocker build/test còn lại. Verification live provider/backend và production ở checklist bên dưới vẫn chưa thực thi.

## Manual checklist trước release

- [ ] Frontend `http://localhost:8443`, API `https://localhost:7190`, trusted dev certificate, đúng CORS/OAuth allowlist; preflight origin lạ bị từ chối.
- [ ] Local register, login email/username, validation và full 8 bước onboarding; completed user vào `/discover`, refresh giữ phiên.
- [ ] Google/GitHub consent thật: first/repeat sign-in, hidden/null email; callback không còn fragment trước API, Tindy JWT chỉ ở response/storage, không URL/UI/logs.
- [ ] Cancel/provider failure/invalid state/correlation: kiểm tra cả frontend redirect error và backend 400 limitation; email conflict hướng explicit Settings linking.
- [ ] Local→Google, Local→GitHub, Google→GitHub; giữ UserId/JWT; đổi account, token hết hạn, expired/replayed link ticket đều không confirm nhầm.
- [ ] Connected Accounts dựa trên backend snapshot; unlink confirmation, double-click, final-method 409 và concurrent changes; không mất phiên vì ticket conflict.
- [ ] Anonymous không vào business/settings/onboarding; incomplete user chỉ vào setup/settings; public legal/auth/callback không loop.
- [ ] Sidebar/Settings logout lúc success/401/403/offline đều clear auth và replace login; Back không mở nội dung protected, preferences/draft khác còn nguyên.
- [ ] Desktop/mobile layout, keyboard actions, loading/retry/error banner; provider Back/bfcache mở lại controls.
- [ ] Production HTTPS origins, SPA fallback cho `/auth/oauth/callback`, proxy/APM redaction, XSS defenses và analytics exclusion cho callback.

Chưa xác minh live backend/database, Google/GitHub app registrations và cookies Secure/SameSite, production TLS/proxy/APM, cross-tab/bfcache trên nhiều browser. Automated fixture passes không được suy thành live provider passes.

Commit đề xuất; chưa commit/push:

- `feat(auth): add google github sign-in and account connections`
- `test(auth): verify oauth callbacks and session security`
