# Tích hợp Profile Media Frontend — STEP 06

Ngày thực hiện: 23/10/2026. Đối chiếu controllers/services/DTO hiện tại của repository `../tindy-backend-platform` và tài liệu STEP 03/04/05, `PROFILE_MEDIA_OPENAPI.yaml`, `CLAMAV_DOCKER_LOCAL.md`. Không thay backend, schema, migrations, secrets hoặc AWS. Không commit/push.

## Certificate — contract đơn giản hóa và một file

Đối chiếu trực tiếp `CertificateDtos.cs`, `CertificateRequestParser.cs`, `CertificateAttachmentService.cs` và OpenAPI của backend. Frontend chỉ gửi `title`, `issuer`, `description`, `credential_url`; không còn Credential ID, Issued Date, Expiry Date hoặc public file URL trong model/UI. Môi trường API phục vụ frontend cần schema mới; lần kiểm tra frontend này không gọi được backend ở HTTPS 7190/HTTP 5217, nên không suy ra trạng thái deploy từ source hoặc kết quả simulation.

Form theo thứ tự: Title và Issuer (required, trim, tối đa 255), Description (textarea, optional, tối đa 2000), Credential URL (optional HTTP/HTTPS, tối đa 1000), Certificate File (optional, một PDF/JPEG/PNG/WebP tối đa 10.000.000 bytes). Optional blank thành null. File ở state riêng, không thuộc CertificateUpsert JSON:

```json
{
  "title": "AWS Cloud Practitioner",
  "issuer": "Amazon Web Services",
  "description": "Foundational knowledge of AWS Cloud services.",
  "credential_url": "https://www.credly.com/badges/example"
}
```

Luồng lưu và retry:

1. POST metadata, nhận certificate_id; cập nhật list/count ngay sau response thành công.
2. Nếu chọn file, dùng endpoint attachment multipart hiện có. Ảnh trả active; PDF có thể processing và tiếp tục poll metadata, không coi upload thành công là đã scan sạch.
3. Nếu upload thất bại/hủy/timeout: giữ certificate ID, metadata và File trong modal; thông báo rõ certificate đã lưu. Retry không POST lại certificate; chỉ PUT cùng ID nếu draft metadata thay đổi rồi upload vào ID đó. Đóng/cancel form không xóa certificate đã lưu.
4. Trước mỗi lần upload từ modal, GET attachment để đối chiếu trường hợp server đã commit nhưng response bị mất. Nếu có file liên kết, hiển thị file để owner quản lý, không tự xóa/thay/upload lần hai. Backend vẫn chặn race bằng unique index và 409.
5. Disable submit trùng bằng pending ref + busy UI. Cancel upload abort request và đối chiếu list/quota; đổi session/storage token đóng editor, abort request cũ, bỏ draft/ID của phiên cũ. Không tiếp tục mutation bằng session mới.

Certificate Card có thumbnail trực tiếp ở cột trái (104px desktop, 90px mobile), metadata/actions bên phải. Mobile đưa vùng quản lý file ra toàn chiều rộng bên dưới. Ảnh active dùng authenticated Blob và object-fit contain; thumbnail mở Preview dùng chung cache. PDF dùng icon/placeholder, không tạo ảnh trang đầu. Không file dùng Award placeholder. Processing/rejected chặn Preview/Download; rejected vẫn chiếm slot tới khi DELETE thành công. Không còn counters nhiều file. Owner quản lý visibility/delete; member chỉ dùng dữ liệu từ member-read endpoint và không có controls ghi. Description render bằng JSX text, không dùng HTML injection.

Các file sửa/thêm **trong task Certificate này**:

- `src/types/profile.ts`, `src/services/profile.service.ts`, `src/services/profileMedia.service.ts`.
- `src/components/profile/ProfileForms.tsx`, `CertificateAttachments.tsx`; thêm `CertificateFilePicker.tsx` dùng chung modal/card.
- `src/hooks/useCertificateAttachments.ts`, `src/pages/profile/ProfileScreen.tsx`, `src/pages/profile/profile.css`.
- `postman/mocks/profile/default.js`, `tests/profile.browser.mjs`, `tests/profile-media.browser.mjs`; thêm `tests/certificate-flow.browser.mjs`.
- Tài liệu này. Các file Avatar/Cover/Auth/OAuth/Onboarding, backend/migration, lockfile và dependencies không sửa trong task này. Reuse nguyên implementation `CertificateAttachmentThumbnail`, `CertificateAttachmentPreview`, `usePrivateMedia` và media quota.

Simulation tái sử dụng mock nội bộ hiện có, cập nhật theo backend contract, bổ sung failure trước/sau upload commit. Frontend/Chrome/fetch/multipart chạy thật qua HTTP; scanner/PDF lifecycle/server persistence là doubles. Không publish workspace hoặc deploy mock. Log `.tmp-profile-verification/media-simulation.ndjson` và screenshots ở `.tmp-profile-verification/screenshots/` đều Git ignored.

Kết quả và giới hạn của lần cập nhật Certificate được ghi ở cuối tài liệu; các checkpoint STEP 06 cũ bên dưới là lịch sử.

## Tính năng

- Owner upload/thay/xóa Avatar (5.000.000 bytes), Cover (10.000.000 bytes), preview trước upload; reset input để chọn lại cùng file, giữ file khi lỗi và khóa submit trùng.
- Chọn default hoặc Google/GitHub thực sự có trong `getAccountConnectionsApi`. Liên kết provider không tự chọn Avatar. Xóa Avatar trả về default. Unlink provider refresh owner Profile để Header cập nhật.
- Dùng cùng Profile resource cho ảnh tại Header/Profile; media mutation response được merge đúng ba trường media rồi GET lại Profile đầy đủ.
- Certificate Add/Edit cho phép chọn tối đa một file cùng metadata. Frontend vẫn POST metadata trước để lấy ID rồi mới POST multipart; upload thất bại giữ ID/file đã chọn và certificate trong list, retry vào đúng ID. Không tự xóa metadata hoặc thay file đang liên kết.
- Upload PDF/JPEG/PNG/WebP tối đa 10 MB; metadata tên/loại/size/status/visibility; ảnh active có thumbnail và Preview, PDF chỉ Preview/Download khi active. Không crop ảnh Certificate.
- Owner list đầy đủ trạng thái; member dùng route member riêng. Không có controls ghi trên Member Profile.
- Chuyển owner_only/members, xác nhận xóa bằng Modal có sẵn, refresh list/quota sau mutation và sau terminal processing. Quota dùng Used, Reserved / processing, Available, Total; 1 MB = 1.000.000 bytes; không tính Avatar/Cover.
- Client kiểm tra size/type/count/quota hỗ trợ UX; backend quyết định cuối cùng. Tối đa hai HTTP upload đồng thời trong một phiên frontend; backend tiếp tục kiểm soát trên user.
- Lỗi 400/401/403/404/409/413/415/429/5xx/network/timeout dùng thông báo sản phẩm, không hiển thị nội dung exception/server internals. Retry do người dùng chủ động, không retry liên tục.

## File tạo/sửa

| File | Vai trò |
| --- | --- |
| `src/services/profileMedia.service.ts` (mới) | Mapping APIs, multipart field file, validation, thông báo lỗi, MB và upload slots |
| `src/services/apiClient.ts` | Chung transport JSON/Blob; Bearer, timeout/cancel, ProblemDetails, sự kiện phiên/onboarding, từ chối phản hồi phiên cũ và redirect |
| `src/types/profile.ts` | ProfileMediaState, CertificateAttachment, AttachmentVisibility, MediaQuota và media fields trên Profile |
| `src/hooks/usePrivateMedia.ts` (mới) | Chia sẻ binary khi còn consumer, quản lý Object URL theo session |
| `src/hooks/useCertificateAttachments.ts` (mới) | GET metadata và bounded polling |
| `src/components/profile/ProfileMediaImage.tsx` (mới) | Avatar/Cover private, fallback initials, loading/error/retry |
| `src/components/profile/ProfileMediaControls.tsx` (mới) | Modal upload/preview/remove/source |
| `src/components/profile/CertificateAttachments.tsx` (mới) | Attachment list/upload/visibility/delete/preview/download |
| `src/components/profile/MediaQuotaSummary.tsx` (mới) | Hiển thị và refresh quota |
| `src/pages/profile/ProfileScreen.tsx`, `profile.css` | Ghép UI, refresh quota khi xóa Certificate, remount theo route/token, giữ responsive/style hiện tại |
| `src/components/layout/Header.tsx` | Avatar lấy từ cùng owner Profile và private-media cache |
| `src/components/auth/ConnectedAccounts.tsx` | Refresh owner Profile sau unlink |
| `postman/mocks/profile/default.js` | Double stateful theo contract media hiện tại; multipart và binary, lifecycle/status/visibility/quota |
| `tests/profile-media-harness.mjs`, `tests/profile-media.browser.mjs` (mới) | Chrome + frontend thật + HTTP qua Postman simulation |
| `tests/profile.browser.mjs` | Proxy chỉ parse JSON đúng Content-Type; selectors và AI assertion khớp source hiện có |
| `tests/profile-fixture.mjs` | Các trường media trong fixture |
| `tests/onboarding.browser.mjs` | Chờ login form mount sau redirect trước khi assert |
| `tests/auth.browser.mjs` | Chờ guidance liên kết provider render sau callback trước khi assert |
| `package.json` | Thêm script test:profile-media; không đổi dependency hoặc lockfile |
| `.gitignore` | Cho phép duy nhất tài liệu bàn giao này xuất hiện trong diff; artifacts vẫn ignored |

## API và DTO mapping

Tất cả dưới backend origin, Bearer JWT hiện có; JSON snake_case và envelope `{success,message,data}`. DELETE 204 không parse body. Media IDs chỉ dùng để xây path cố định, không nhận URL tùy ý để gửi JWT.

| Method | Path | Dữ liệu |
| --- | --- | --- |
| POST / DELETE | `/api/me/profile/avatar` | FormData `file` → 200 ProfileMediaState / 204 |
| PUT | `/api/me/profile/avatar/source` | `{source:"default"}` hoặc `{source:"oauth",provider:"google"\|"github"}` → ProfileMediaState |
| POST / DELETE | `/api/me/profile/cover-image` | FormData `file` → 200 ProfileMediaState / 204 |
| GET | `/api/media/{media_asset_id}/content` | Blob sau JWT; không gán API URL trực tiếp vào img/href |
| POST / GET | `/api/me/profile/certificates/{certificate_id}/attachments` | Multipart file → 201 active / 202 processing; GET metadata owner |
| PATCH | `/api/me/profile/certificates/{certificate_id}/attachments/{attachment_id}/visibility` | `{visibility:"owner_only"\|"members"}` → metadata |
| DELETE | `/api/me/profile/certificates/{certificate_id}/attachments/{attachment_id}` | 204; không DELETE collection |
| GET | `/api/users/{user_id}/profile/certificates/{certificate_id}/attachments` | Metadata do server lọc cho caller/member |
| GET | `/api/me/profile/media/quota` | quota_bytes, used_bytes, reserved_bytes, available_bytes |

ProfileMediaState chỉ gồm `avatar_source`, `avatar_media_asset_id`, `cover_media_asset_id`; không thay toàn bộ Profile bằng DTO này. Attachment đúng tám trường `attachment_id`, `media_asset_id`, `file_name`, `content_type`, `file_size_bytes`, `status`, `visibility`, `created_at`; không dựa vào scan_status, scanner reason hoặc URL công khai. Mọi attachment còn liên kết, gồm `pending_upload`/`processing`/`active`/`rejected`, chiếm slot duy nhất; chỉ active cho preview/download/share. Phải DELETE thành công rồi mới chọn file khác.

## Private Blob và Object URL lifecycle

`apiBlobRequest` dùng chung transport `apiRequest`: API base, JWT, timeout 15 giây, AbortSignal, ProblemDetails, SESSION_EXPIRED/ONBOARDING_REQUIRED. Các path phải thuộc `/api/`; không đi theo HTTP redirect. Kiểm tra token/session signal trước và sau đọc body, để phản hồi cũ không ghi đè phiên mới.

Cache ảnh chỉ nằm trong memory, có reference count cho các consumer đang mounted, scope theo token. Header và Profile cùng asset dùng một Blob/URL. Consumer cuối unmount/thay ID sẽ abort và revoke; logout/token change/storage event xóa cache. Entry thất bại bị evict để retry hoạt động. Không cache vào localStorage hoặc query JWT.

Preview file local revoke khi đổi file/đóng Modal/unmount. Image attachment active dùng authenticated thumbnail ngay trên trái Certificate Card. Thumbnail và image Preview chia sẻ ref-counted Blob URL; đóng Preview không revoke URL mà thumbnail còn giữ. Consumer cuối unmount mới revoke. PDF chỉ fetch khi mở Preview hoặc Download, có kiểm tra MIME; không tạo thumbnail trang đầu. Download tạo Blob URL tạm và revoke sau khi browser nhận lượt download (1 giây), hoặc khi unmount/logout. Mọi request đang chạy bị abort và kiểm tra lại token trước khi tạo URL/cập nhật UI.

Legacy URL chỉ hiển thị với bản ghi chưa có private asset và chưa có avatar_source. Không fallback sang legacy/OAuth khi private fetch lỗi. Avatar default hiển thị initials theo component sẵn có. 404 có thông báo chung, không suy diễn file tồn tại nhưng bị cấm.

## Polling và quota

- Chỉ poll metadata khi có processing, khoảng 5 giây sau GET trước hoàn tất; không request chồng nhau.
- Pause khi document.hidden; dừng khi không còn processing, request lỗi, certificate/profile unmount, token/context đổi hoặc hết 120 giây.
- Hết thời gian vẫn giữ processing từ server, hiện nút Check attachments again để theo dõi lượt mới. Không tự rejected/clean.
- Mỗi attachment processing chuyển terminal đều refresh quota. Poll không tải binary; download/preview chỉ theo thao tác người dùng.
- Mutation attachment refresh list/quota cả khi response lỗi, vì abort/timeout không chứng minh server rollback. Khi quay lại Profile, owner Profile đang cache được refetch để đối chiếu upload có thể đã commit sau navigation/cancel. Xóa Certificate unmount toàn bộ attachments/polling/preview của Certificate và refresh quota.
- Quota hiển thị trực tiếp các trường server; thanh quota cộng used + reserved một lần, không cộng thêm file_size_bytes.

## Cấu hình và chạy Local

Repo có cả package-lock.json và pnpm-lock.yaml; `.mise.toml` ghi pnpm 10.34.3 nhưng executable pnpm không có trên PATH của phiên này. `node_modules/.package-lock.json` hiện có, nên đã dùng npm scripts đã cài sẵn, không cài lại dependencies/đổi manager/tạo lockfile mới.

Frontend mặc định Development gọi `https://localhost:7190`; Production mặc định same-origin. Có thể đặt `VITE_API_BASE_URL` trong environment riêng hoặc file `.env.local` (ignored), giá trị là origin HTTPS, không có `/api` ở cuối. HTTP chỉ được phép loopback trong Development. Dùng cấu hình CORS hiện có của backend cho origin Vite; trust dev HTTPS certificate theo môi trường máy.

```powershell
# Backend, từ ../tindy-backend-platform; giữ nguyên config JWT/DB riêng hiện tại.
docker compose -f compose.clamav.yml up -d --wait --wait-timeout 180
docker compose -f compose.clamav.yml ps
dotnet run --project .\src\Tindy.Api --launch-profile https --environment Development

# Frontend, từ tindy-platform-frontend, dùng dependencies hiện có.
npm run dev -- --host localhost
npm run typecheck
npm run build
npm run test:profile
npm run test:profile-media
npm run test:auth
npm run test:onboarding
```

Backend launchSettings: HTTPS 7190, HTTP 5217. ClamAV theo `../tindy-backend-platform/docs/guide/CLAMAV_DOCKER_LOCAL.md`, nhận INSTREAM tại 127.0.0.1:3310; cần container healthy và MediaLifecycle enabled. PDF thường đổi trạng thái theo worker khoảng 30 giây. Storage local ngoài content root; không sửa connection strings/JWT hoặc chạy migrations để thử frontend.

Browser tests cần Postman CLI >=1.70, Chrome và Node. Có thể cấu hình `POSTMAN_PATH`, `CHROME_PATH`. Tests tự mở Vite/Chrome isolated và simulation loopback, tự cleanup. Log/screenshot ở `.tmp-profile-verification/` ignored; không dùng account thật. Owner mock search trên Postman workspace không thực hiện vì repo đã có mock nội bộ và contract backend ngay trong workspace; mở rộng chính mock đó, không pull nguồn không xác định.

## Kết quả kiểm thử STEP 06 (checkpoint lịch sử)

| Kiểm tra | Kết quả thực chạy |
| --- | --- |
| `npm run typecheck` | PASS, TypeScript không lỗi |
| `npm run build` | PASS, 2048 modules; còn warning cấu hình Vite native và bundle >500 kB |
| `npm run test:profile` | PASS 44 checks, 156 HTTP requests qua Postman simulation ở lượt cuối |
| `npm run test:profile-media` | PASS 29 checks, 232 HTTP requests qua Postman simulation trên source cuối |
| `npm run test:auth` | PASS 58 checks, 110 HTTP fixture calls trên source cuối |
| `npm run test:onboarding` | PASS 41 checks, 144 intercepted API calls |
| `git diff --check` | PASS; Git chỉ báo chuyển LF → CRLF theo config Windows cho các file đã format |
| Visual QA | Đã xem ảnh desktop/mobile 390px; không tràn ngang; Modal/controls theo style hiện tại |

Profile/Media/Auth chạy React thật với HTTP fixture/simulation; riêng Onboarding giữ hạ tầng intercept hiện có. Media checks bao gồm multipart boundary/field file, preview/retry/input reset, default/Google/GitHub source, đồng bộ Header, private Bearer/refresh/404, image 201/PDF 202, active/rejected, visibility/member list, quota/count/size/type, DELETE attachment/Certificate, poll không chồng GET chậm, pause tab, timeout HTTP thực 15 giây, 429, 400/403/404/409/413/415/500, Chrome network offline, switch token khi binary 401 đang chờ, unmount khi upload, refetch khi quay lại Profile sau abort và logout khi binary pending/Object URL cleanup. Nhánh deadline 120 giây được kiểm tra bằng nhảy đồng hồ Date.now trong browser; polling 5 giây và HTTP vẫn chạy thật. Mock PDF lifecycle mô phỏng server metadata, không chạy antivirus. Harness ghép request/response bằng identity của incoming request; request bị browser abort không bị tính nhầm là poll đang chạy.

Đã sửa hai giả định cũ của Profile test: nhãn skill hiện không có dấu `+` bằng text và AI Studio hiện có local demo. Test mới xác nhận demo không ghi Profile API, không thay đổi sản phẩm AI Studio. Onboarding/Auth tests được thêm wait cho UI đích sau navigation để tránh assertion trước khi React render hoàn tất. Mock attachment GET chỉ lưu state khi scan double thật sự thay đổi; mock request chậm lấy lại state mới trước mutation, tránh snapshot cũ ghi đè fault control đồng thời.

## Giới hạn nghiệm thu thật

Đã kiểm tra chỉ đọc máy Local: ClamAV container healthy và port 3310/PostgreSQL 5432 đang lắng nghe. Không có backend HTTP đang chạy ở 7190/5217 và không có test account riêng được cung cấp; chưa chạy frontend end-to-end với backend thật, PostgreSQL thật hoặc antivirus thật. Không lấy kết quả backend cũ làm bằng chứng frontend.

Trước nghiệm thu môi trường thật: dùng hai tài khoản test riêng đã Active/onboarding; thử upload/thay/xóa Avatar/Cover, provider đã liên kết, ảnh Certificate và PDF sạch; chờ worker đổi status; chia sẻ/unshare và đối chiếu account member, quota, xóa Certificate cùng attachments. Chỉ chạy antivirus EICAR bằng bộ test riêng đã có của backend theo hướng dẫn ClamAV, không upload mẫu lên tài khoản thật.

## Kết quả cập nhật Certificate một file — 23/10/2026

| Kiểm tra | Kết quả thực chạy |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run build` | PASS, 2051 modules; còn các warning Vite native config và chunk >500 kB hiện có |
| `npm run test:profile` | PASS **44 checks**, **163 HTTP requests** qua Postman simulation |
| `npm run test:profile-media` | PASS **57 checks**, **562 HTTP requests** qua Postman simulation |
| Visual QA | Đã xem ảnh card và Add Certificate modal desktop/mobile 390px; thumbnail thực từ file synthetic trên trái card, không tràn ngang |
| `git diff --check` | PASS |

Các tình huống mới đã chạy: title/issuer-only với optional null và không file; metadata/Description/URL mới; giới hạn title/issuer/description/URL, file type/size; create rồi upload ảnh/PDF; chặn submit trùng; giữ ID/File/list sau lỗi upload; retry không tạo certificate thứ hai và PUT đúng ID nếu đổi draft; reconcile response bị mất sau server commit; Cancel upload và late commit; session-change đóng editor/abort và giữ token mới; edit metadata giữ file cũ; editor có file không cho chọn replacement; preview ngay trong editor dùng cache hiện có, đóng preview không đóng editor; image thumbnail trực tiếp trên card; Award/PDF placeholder; description HTML-like là text an toàn; layout desktop/mobile.

Các nhánh media tiếp tục pass: image/PDF Preview, MIME validation/fallback/retry, Blob ownership/dedup/revoke, owner/member visibility, processing/rejected và polling/timeout/429, slot occupied ở mọi trạng thái, DELETE rồi upload file khác, quota decimal 200 MB, multipart/binary JWT, session/unmount/logout cancellation. Không bỏ các assertions media cũ: fixtures ảnh và PDF được đặt trên hai certificate riêng để khớp giới hạn một file.

Screenshots Git ignored: `certificate-card-desktop.png`, `certificate-card-mobile.png`, `certificate-editor-desktop.png`, `certificate-editor-mobile.png` tại `.tmp-profile-verification/screenshots/`. Ảnh certificate là fixture PNG synthetic tạo bằng canvas trong browser test, không phải file của người dùng.

Giới hạn: backend HTTP không phản hồi ở 7190/5217 tại lần kiểm tra này. Chưa nghiệm thu frontend với backend thật, account thật hoặc ClamAV scan thật trong task frontend. Kết quả backend/ClamAV ở task backend trước không được tính thành bằng chứng frontend end-to-end. Không thay backend/migration, không thêm dependencies và không commit/push.

## Avatar & Cover Editor — 23/10/2026

Nút camera của owner nằm ở góc dưới phải avatar; nút Edit cover nằm ở góc trên phải banner. Member view không có hai control này. Banner có ảnh sẽ ẩn các đường trang trí và caption để không che ảnh; chiều cao responsive hiện có được giữ nguyên.

Editor dùng Modal/Button hiện có, có current photo, nguồn avatar hiện tại, file picker có nhãn và keyboard focus, filename, clear selection, upload tường minh, remove khi có ảnh, trạng thái chờ/lỗi và toast thành công. Default/Google/GitHub vẫn là các hành động riêng; provider chỉ xuất hiện từ `/api/auth/connections`, lỗi connections có Retry. Lỗi `MEDIA_OAUTH_AVATAR_UNAVAILABLE` giữ nguyên ảnh/nguồn hiện tại và không thử provider khác.

Avatar preview dùng center crop trong vòng tròn. Cover có preview center crop 3:1 tương ứng output 1500 × 500, cùng một dải “On your profile” mô phỏng crop thêm theo tỷ lệ banner thực đo bằng ResizeObserver. Đây là preview xấp xỉ bằng CSS; xử lý pixel, orientation, resize, WebP và validation cuối cùng vẫn ở backend. Không có kéo crop hoặc zoom.

File không hợp lệ theo MIME/size được gán về null, bỏ filename/preview và disable Upload, thay vì giữ file hợp lệ trước đó. File hợp lệ mới xóa lỗi validation; clear, thay file, đóng editor và đổi session thu hồi Object URL. Preview chỉ dùng URL thuộc đúng File đang chọn. Nếu browser không decode được preview, UI báo rõ và vẫn cho backend kiểm tra file khi người dùng chủ động upload. Avatar giữ giới hạn 5,000,000 bytes; Cover 10,000,000 bytes; JPEG/PNG/WebP.

Mutation có pending ref chống double submit, AbortController khi unmount/session đổi, kiểm tra token trước cập nhật, merge media DTO vào profile rồi GET profile hoàn chỉnh. Request lỗi giữ selection để retry và reload profile để reconcile trường hợp server đã commit. Header/profile/current preview dùng hook Private Media hiện có với cache ref-count; không thêm đường dẫn public hoặc local path.

Endpoint, payload multipart/JSON, JWT, permissions và services không đổi: POST/DELETE avatar, PUT avatar/source, POST/DELETE cover-image, GET media content. Không thay backend, migration, dependencies, Certificate hoặc Experiences. API Profile hiện chỉ trả `avatar_source: oauth`, không trả provider đang chọn; UI ghi “Connected account” để không đoán Google/GitHub.

File thay đổi cho task này: `src/components/profile/ProfileMediaControls.tsx`, phần media header trong `src/pages/profile/ProfileScreen.tsx`, phần media CSS trong `src/pages/profile/profile.css`, `tests/profile-image-editor.browser.mjs`, `tests/profile-media.browser.mjs`, `tests/private-media-retry.browser.mjs`, `postman/mocks/profile/default.js` và tài liệu này. Private Media retry test nay retry cả hai thumbnail đang mount cùng Preview và vẫn xác nhận đúng một binary GET/thu hồi URL cũ. Fixture connections áp dụng fault injection trước response để kiểm thử lỗi/retry qua HTTP thật.

Test dùng React và Chrome thật qua local Postman simulation đã có, dựng theo contract backend trong repository; không dùng mock service công khai mới, không kiểm thử OAuth provider/image processing/backend thật trong task UI này. Đã xem screenshots avatar/cover editor ở desktop và mobile 390px; ảnh chọn là canvas synthetic trong test.

Kết quả thực chạy cuối task:

| Lệnh | Kết quả |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run build` | PASS; 2051 modules, còn warning Vite native config/chunk >500 kB hiện có |
| `npm run test:profile-media` | PASS **64 checks**, **631 HTTP calls** từ frontend qua local Postman simulation |
| `npm run test:profile` | PASS **44 checks**, **161 HTTP calls** từ frontend qua local Postman simulation |
| `git diff --check` | PASS |

Coverage mới: keyboard Enter mở editor; current photo/source; avatar circle và cover crop hai bước; ảnh JPEG/PNG/WebP; valid → invalid/oversized xóa stale file/URL; thay/clear/close thu hồi URL; clear lỗi khi chọn file hợp lệ; 500 giữ ảnh để retry; double-click chỉ một POST và khóa thao tác lúc pending; upload refresh profile/Header không mất bio; failure provider avatar không fallback; connections lỗi/retry; source OAuth/default và điều kiện Remove; modal desktop/mobile; member không có edit; đổi session khi upload đóng modal và giữ token mới. Các test media cũ tiếp tục xác nhận JWT, bodyless DELETE, Google/GitHub selection, 429/timeout, privacy, polling và cleanup khi logout/unmount.

Screenshots Git ignored: `.tmp-profile-verification/screenshots/profile-avatar-editor-desktop.png`, `profile-avatar-editor-mobile.png`, `profile-cover-editor-desktop.png`, `profile-cover-editor-mobile.png`. Log local `.tmp-profile-verification/media-simulation.ndjson` có request evidence; không commit dữ liệu runtime. Các lần chạy giữa quá trình đã phát hiện và sửa input Enter của harness, fault injection connections và giả định test một thumbnail; kết quả bảng trên là lần chạy hoàn chỉnh sau sửa.
