# TINDY PLATFORM — COMPREHENSIVE REST & WEBSOCKET API SPECIFICATION
**Version:** 2.0.0  
**Base URL:** `https://api.tindy.fcaj.community/api/v1`  
**WebSocket URL:** `wss://api.tindy.fcaj.community/ws`  
**Architecture:** RESTful JSON + Realtime WebSockets (RFC 6455)  
**Security:** OAuth2 / JWT Bearer Tokens (`Authorization: Bearer <token>`) + RBAC (Role-Based Access Control)  

---

## 1. HỆ THỐNG KIẾN TRÚC & QUY ƯỚC CHUNG (GENERAL ARCHITECTURE)

### 1.1. HTTP Status Codes
- `200 OK`: Thành công (GET, PUT, PATCH).
- `201 Created`: Tạo tài nguyên mới thành công (POST).
- `204 No Content`: Xóa hoặc thực thi hành động không cần payload trả về (DELETE).
- `400 Bad Request`: Payload không hợp lệ hoặc thiếu trường bắt buộc.
- `401 Unauthorized`: Token hết hạn, sai hoặc chưa đăng nhập.
- `403 Forbidden`: Người dùng không có quyền truy cập tài nguyên (Role-based).
- `404 Not Found`: Không tìm thấy tài nguyên.
- `409 Conflict`: Trùng lặp dữ liệu (Email đã đăng ký, vị trí đã được tuyển, v.v.).
- `422 Unprocessable Entity`: Dữ liệu vi phạm logic nghiệp vụ (Matching rule validation, v.v.).
- `500 Internal Server Error`: Lỗi máy chủ nội bộ.

### 1.2. Định dạng Response chuẩn (Standard Response Envelope)
#### Phản hồi thành công (Success Response):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation completed successfully",
  "data": { ... },
  "metadata": {
    "page": 1,
    "limit": 20,
    "totalItems": 142,
    "totalPages": 8
  },
  "timestamp": "2026-10-06T09:40:00.000Z"
}
```

#### Phản hồi lỗi chuẩn (RFC 7807 Error Response):
```json
{
  "success": false,
  "statusCode": 400,
  "error": "BAD_REQUEST",
  "message": "Validation failed on input payload",
  "details": [
    {
      "field": "weeklyCommitment",
      "issue": "Weekly commitment must be between 4 and 40 hours"
    }
  ],
  "timestamp": "2026-10-06T09:40:00.000Z",
  "path": "/api/v1/projects"
}
```

### 1.3. Phân quyền người dùng (User Roles & Permissions)
- `USER`: Role người dùng hợp nhất (Unified User Role). Trong hệ sinh thái dự án, mọi User đều có đầy đủ quyền hạn để:
  1. Khám phá, lưu và ứng tuyển tham gia các dự án khác (với tư cách ứng viên / thành viên đội ngũ).
  2. Tự khởi tạo, đăng tin tuyển mộ thành viên và quản lý các dự án của riêng mình (với tư cách chủ nhiệm / người sáng lập dự án).
- `ADMIN`: Quản trị viên hệ thống quản lý kiểm duyệt dự án, cấu hình trọng số thuật toán AI và quản lý trường học.

---

## 2. NHÓM 1: AUTHENTICATION & ACCESS CONTROL (XÁC THỰC & BẢO MẬT)

### `POST /api/v1/auth/register`
- **Mô tả:** Đăng ký tài khoản người dùng nền tảng mới.
- **Quyền:** Public.
- **Request Body:**
  ```json
  {
    "fullName": "Alex Le",
    "email": "alex.le@fpt.edu.vn",
    "password": "StrongPassword123!",
    "role": "USER",
    "university": "FPT University",
    "acceptTerms": true
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "user": {
      "id": "usr_9981",
      "email": "alex.le@fpt.edu.vn",
      "fullName": "Alex Le",
      "role": "USER",
      "isEmailVerified": false
    },
    "tokens": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "d8a1c90..."
    }
  }
  ```

### `POST /api/v1/auth/login`
- **Mô tả:** Đăng nhập bằng email trường và mật khẩu.
- **Quyền:** Public.
- **Request Body:**
  ```json
  {
    "email": "alex.le@fpt.edu.vn",
    "password": "StrongPassword123!",
    "rememberMe": true
  }
  ```
- **Response `200 OK`:** Access token, Refresh token, Profile tóm tắt và Workspace role.

### `POST /api/v1/auth/refresh-token`
- **Mô tả:** Làm mới Access Token khi token cũ hết hạn (15 phút).
- **Quyền:** Public (Có Refresh Token).
- **Request Body:** `{ "refreshToken": "d8a1c90..." }`
- **Response `200 OK`:** Token mới.

### `POST /api/v1/auth/logout`
- **Mô tả:** Đăng xuất, hủy bỏ Refresh Token và xóa phiên làm việc.
- **Quyền:** Bearer Token.
- **Response `200 OK`:** `{ "message": "Successfully logged out" }`.

### `POST /api/v1/auth/forgot-password`
- **Mô tả:** Gửi email yêu cầu đặt lại mật khẩu với liên kết OTP/Token.
- **Quyền:** Public.
- **Request Body:** `{ "email": "alex.le@fpt.edu.vn" }`
- **Response `200 OK`:** `{ "message": "Password reset instructions sent to institutional email" }`.

### `POST /api/v1/auth/reset-password`
- **Mô tả:** Xác thực token reset và cập nhật mật khẩu mới.
- **Quyền:** Public.
- **Request Body:**
  ```json
  {
    "resetToken": "rst_token_8812",
    "newPassword": "NewStrongPassword456!"
  }
  ```
- **Response `200 OK`:** Thành công.

### `POST /api/v1/auth/verify-email`
- **Mô tả:** Xác thực email trường qua mã pin hoặc URL xác thực.
- **Quyền:** Public.
- **Request Body:** `{ "token": "verify_token_123" }`
- **Response `200 OK`:** Email đã được kích hoạt.

---

## 3. NHÓM 2: ONBOARDING WIZARD (THIẾT LẬP BAN ĐẦU)

### `GET /api/v1/onboarding/status`
- **Mô tả:** Lấy tiến độ wizard onboarding của tài khoản (Current Step, Completion %).
- **Quyền:** Bearer Token.
- **Response `200 OK`:**
  ```json
  {
    "completed": false,
    "currentStep": 2,
    "totalSteps": 4,
    "completedSteps": ["ROLE_SELECTION", "ACADEMIC_CREDENTIALS"],
    "pendingSteps": ["SKILLS_EXPERIENCE", "AI_PREFERENCES"]
  }
  ```

### `POST /api/v1/onboarding/step`
- **Mô tả:** Lưu tiến độ và thông tin cho từng bước onboarding.
- **Quyền:** Bearer Token.
- **Request Body:**
  ```json
  {
    "step": 3,
    "preferredRole": "Backend Developer",
    "skills": [".NET", "AWS", "PostgreSQL", "React"],
    "weeklyAvailabilityHours": 10,
    "projectInterests": ["AI Customer Support", "Cloud Infrastructure"]
  }
  ```
- **Response `200 OK`:** Cập nhật thành công.

### `POST /api/v1/onboarding/complete`
- **Mô tả:** Đánh dấu hoàn thành toàn bộ onboarding và kích hoạt Discovery Engine.
- **Quyền:** Bearer Token.
- **Response `200 OK`:** `{ "onboardingCompleted": true, "redirectUrl": "/dashboard" }`.

---

## 4. NHÓM 3: USER PROFILE & CREDENTIALS (QUẢN LÝ HỒ SƠ)

### `GET /api/v1/profile/me`
- **Mô tả:** Lấy toàn bộ thông tin hồ sơ của người dùng hiện tại (Alex Le).
- **Quyền:** Bearer Token.
- **Response `200 OK`:**
  ```json
  {
    "id": "usr_alex_le",
    "name": "Alex Le",
    "university": "FPT University",
    "email": "alex.le@fpt.edu.vn",
    "role": "Backend Developer",
    "hours": "10",
    "interests": "Cloud computing, AI applications, open source",
    "skills": [".NET", "AWS", "PostgreSQL", "React", "TypeScript", "Git"],
    "summary": "Backend-focused developer with hands-on experience in .NET, AWS, and PostgreSQL...",
    "github": "github.com/alexle",
    "portfolio": "alexle.dev",
    "avatarUrl": "https://cdn.fcaj.community/avatars/alex.png",
    "profileStrength": 85,
    "technologies": "Docker, AWS Lambda, EventBridge",
    "verified": true
  }
  ```

### `PUT /api/v1/profile/me`
- **Mô tả:** Cập nhật thông tin profile cơ bản (Role, Hours, Bio, Links).
- **Quyền:** Bearer Token.
- **Request Body:**
  ```json
  {
    "role": "Backend Developer",
    "hours": "12",
    "interests": "Cloud computing, RAG, Large Language Models",
    "summary": "Updated bio...",
    "github": "https://github.com/alexle",
    "portfolio": "https://alexle.dev"
  }
  ```
- **Response `200 OK`:** Profile đã cập nhật.

### `POST /api/v1/profile/me/avatar`
- **Mô tả:** Tải lên ảnh đại diện đại học (Multipart Form Data).
- **Quyền:** Bearer Token.
- **Payload:** `multipart/form-data` with `file: image/png|jpeg` (Max 5MB).
- **Response `200 OK`:** `{ "avatarUrl": "https://cdn.fcaj.community/avatars/alex_17912.jpg" }`.

### `GET /api/v1/profile/:userId`
- **Mô tả:** Lấy thông tin public profile của sinh viên hoặc lead khác.
- **Quyền:** Bearer Token.
- **Response `200 OK`:** Thông tin chi tiết, verified badges, past projects, certificates.

### `GET /api/v1/profile/me/experiences`
- **Mô tả:** Lấy danh sách các dự án thực chiến trước đây trong hồ sơ (Previous Projects).
- **Quyền:** Bearer Token.
- **Response `200 OK`:**
  ```json
  [
    {
      "id": "exp_1",
      "name": "RAG Support Chatbot",
      "role": "Backend Developer",
      "desc": "Built an intelligent university knowledge assistant using .NET 8, PostgreSQL pgvector and AWS Bedrock.",
      "tech": [".NET 8", "AWS", "pgvector", "FastAPI"],
      "repoUrl": "https://github.com/alexle/rag-support",
      "startDate": "2025-09",
      "endDate": "2025-12"
    }
  ]
  ```

### `POST /api/v1/profile/me/experiences`
- **Mô tả:** Thêm kinh nghiệm dự án mới vào hồ sơ cá nhân.
- **Quyền:** Bearer Token.
- **Request Body:**
  ```json
  {
    "name": "Ticket Management Microservice",
    "role": "Backend Engineer",
    "desc": "Implemented event-driven ticket dispatcher with AWS EventBridge & Lambda.",
    "tech": [".NET", "AWS EventBridge", "Docker"],
    "repoUrl": "https://github.com/alexle/ticket-service"
  }
  ```
- **Response `201 Created`:** Object kinh nghiệm mới kèm ID.

### `PUT /api/v1/profile/me/experiences/:expId`
- **Mô tả:** Cập nhật thông tin dự án kinh nghiệm.
- **Quyền:** Bearer Token.
- **Response `200 OK`:** Kinh nghiệm sau sửa đổi.

### `DELETE /api/v1/profile/me/experiences/:expId`
- **Mô tả:** Xóa dự án kinh nghiệm khỏi hồ sơ.
- **Quyền:** Bearer Token.
- **Response `204 No Content`**.

### `GET /api/v1/profile/me/certificates`
- **Mô tả:** Lấy danh sách chứng chỉ học thuật đã xác minh (Verified Academic Credentials).
- **Quyền:** Bearer Token.
- **Response `200 OK`:**
  ```json
  [
    {
      "id": "cert_1",
      "title": "AWS Certified Cloud Practitioner",
      "issuer": "Amazon Web Services",
      "credentialId": "AWS-CLF-89211",
      "issueDate": "2025-11",
      "verified": true
    }
  ]
  ```

### `POST /api/v1/profile/me/certificates`
- **Mô tả:** Đăng ký chứng chỉ mới để hệ thống kiểm duyệt.
- **Quyền:** Bearer Token.
- **Request Body:**
  ```json
  {
    "title": "Meta Front-End Developer Specialization",
    "issuer": "Coursera / Meta",
    "credentialUrl": "https://coursera.org/verify/META99"
  }
  ```
- **Response `201 Created`**.

### `POST /api/v1/profile/me/resume/upload`
- **Mô tả:** Tải lên file CV / Resume (PDF) để AI phân tích trích xuất kỹ năng.
- **Quyền:** Bearer Token.
- **Payload:** `multipart/form-data` with `file: application/pdf`.
- **Response `200 OK`:** File URL, extracted metadata.

---

## 5. NHÓM 4: DASHBOARD & WORKSPACE OVERVIEW (TỔNG QUAN)

### `GET /api/v1/dashboard/metrics`
- **Mô tả:** Lấy các chỉ số thống kê trên Dashboard (Stats Grid).
- **Quyền:** Bearer Token.
- **Response `200 OK`:**
  ```json
  {
    "activeProjectsCount": 2,
    "pendingInvitationsCount": 1,
    "averageMatchScore": 92,
    "savedOpportunitiesCount": 4,
    "weeklyCommittedHours": 18,
    "profileCompleteness": 85
  }
  ```

### `GET /api/v1/dashboard/featured-opportunity`
- **Mô tả:** Lấy cơ hội dự án nổi bật đề xuất cho người dùng (Opportunity Banner - EcoTrack).
- **Quyền:** Bearer Token.
- **Response `200 OK`:**
  ```json
  {
    "id": "ecotrack",
    "name": "EcoTrack Sustainability Initiative",
    "category": "Social Impact · Environmental",
    "headline": "Formal team invitation received from Jamie Le",
    "commitment": "10-12 hrs/week",
    "role": "Frontend Developer",
    "matchScore": 90,
    "actionType": "INVITATION"
  }
  ```

### `GET /api/v1/dashboard/recommended-feed`
- **Mô tả:** Lấy danh sách dự án đề xuất tabbed theo độ phù hợp (High Match, Quick Sprint, Beginners).
- **Query Params:** `tab=recommended|recent|starred`, `limit=6`.
- **Response `200 OK`:** Mảng các đối tượng `ProjectItem`.

### `GET /api/v1/dashboard/next-steps`
- **Mô tả:** Lấy danh sách các gợi ý hành động tiếp theo (Next Steps Checklist).
- **Response `200 OK`:**
  ```json
  [
    {
      "id": "step_1",
      "title": "Review EcoTrack Invitation",
      "description": "Jamie Le sent you an offer for Frontend Developer (10 hrs/week).",
      "actionUrl": "/projects?tab=Invited",
      "type": "INVITE"
    },
    {
      "id": "step_2",
      "title": "Add Docker to verified skills",
      "description": "3 high-matching projects require containerization knowledge.",
      "actionUrl": "/ai-studio",
      "type": "SKILL_GAP"
    }
  ]
  ```

---

## 6. NHÓM 5: DISCOVERY ENGINE & SWIPE DECK (KHÁM PHÁ & THUẬT TOÁN AI)

### `GET /api/v1/discovery/projects`
- **Mô tả:** Lấy bộ thẻ bài dự án cho giao diện Swipe Deck (Dành cho Student).
- **Query Params:**
  - `role`: (string) e.g. `Backend Developer`, `All`
  - `skill`: (string) e.g. `AWS`, `All`
  - `minScore`: (number) e.g. `0`, `35`, `65`, `90`
  - `page`: (number) e.g. `1`
  - `limit`: (number) e.g. `10`
- **Response `200 OK`:**
  ```json
  {
    "projects": [
      {
        "id": "proj-1",
        "name": "AI Customer Support System",
        "tagline": "RAG-driven contextual query agent",
        "desc": "Build an AI-powered customer support platform using RAG and cloud services...",
        "category": "AI & Cloud Infrastructure",
        "role": "Backend Developer",
        "skills": [".NET", "AWS", "PostgreSQL", "RAG", "LLM"],
        "niceToHave": ["Docker", "Redis"],
        "hours": "10 hrs/week",
        "duration": "3 months",
        "teamSize": 3,
        "maxTeamSize": 5,
        "teamMembers": [
          { "name": "Minh Nguyen", "role": "Lead Architect", "avatar": "...", "initials": "MN" }
        ],
        "goals": ["Build retrieval-augmented knowledge base", "Deploy scalable API on AWS"],
        "techStack": [".NET 8", "AWS Bedrock", "PostgreSQL", "Docker"],
        "leadName": "Minh Nguyen",
        "leadRole": "Lead Architect",
        "leadAvatar": "https://cdn.fcaj.community/avatars/minh.png",
        "color": "violet",
        "match": {
          "overall": 92,
          "verdict": "Excellent Match",
          "factors": [
            { "label": "Technical Skills", "weight": 40, "score": 90, "detail": "Strong alignment in .NET, AWS and PostgreSQL" },
            { "label": "Interest Match", "weight": 20, "score": 95, "detail": "Targeted domain interest in AI applications" },
            { "label": "Preferred Role", "weight": 15, "score": 100, "detail": "Perfect fit for Backend Developer" },
            { "label": "Past Experience", "weight": 15, "score": 80, "detail": "Prior work on RAG chatbot" },
            { "label": "Availability", "weight": 10, "score": 100, "detail": "10 hrs/week requested and supplied" }
          ],
          "strongMatches": [".NET Core", "AWS S3 / Bedrock", "PostgreSQL"],
          "skillGaps": [
            { "skill": "Docker", "note": "Basic container knowledge desired for deployment", "recommendation": "Review Docker compose fundamentals" }
          ],
          "explanationSummary": "Alex has proven hands-on experience in .NET backend development and AWS..."
        }
      }
    ],
    "totalCount": 24
  }
  ```

### `GET /api/v1/discovery/candidates`
- **Mô tả:** Lấy bộ thẻ bài ứng viên cho giao diện Swipe Deck (Dành cho Project Leader).
- **Query Params:** `role`, `skill`, `minScore`, `page`, `limit`.
- **Response `200 OK`:** Mảng các đối tượng `DiscoveryCandidate` kèm đầy đủ `match breakdown`.

### `POST /api/v1/discovery/swipe`
- **Mô tả:** Ghi nhận quyết định vuốt thẻ (Swipe Right / Left / Up) của người dùng.
- **Quyền:** Bearer Token.
- **Request Body:**
  ```json
  {
    "itemId": "proj-1",
    "itemType": "PROJECT",
    "direction": "right",
    "decision": "INTERESTED",
    "timestamp": 1791278200000
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "recorded": true,
    "nextFunnelStatus": "Interested",
    "notificationsTriggered": ["LEAD_INFORMED_OF_INTEREST"],
    "historyId": "swp_8871"
  }
  ```

### `POST /api/v1/discovery/swipe/undo`
- **Mô tả:** Hoàn tác hành động vuốt thẻ gần nhất (Undo Last Swipe).
- **Quyền:** Bearer Token.
- **Response `200 OK`:** Trả lại item đã vuốt vào đầu stack.

### `POST /api/v1/discovery/stack/reset`
- **Mô tả:** Đặt lại toàn bộ stack bài để xem lại từ đầu.
- **Quyền:** Bearer Token.
- **Request Body:** `{ "mode": "projects" }` (hoặc `"candidates"`)
- **Response `200 OK`:** Reset thành công.

### `GET /api/v1/discovery/matches/:targetId/explanation`
- **Mô tả:** Lấy phân tích giải thích thuật toán AI chi tiết cho modal "Why 92%?" (AiExplanationModal).
- **Quyền:** Bearer Token.
- **Path Params:** `targetId` (ID của dự án hoặc ứng viên).
- **Response `200 OK`:**
  ```json
  {
    "targetId": "proj-1",
    "overall": 92,
    "verdict": "Excellent Match",
    "factors": [
      { "label": "Technical Skills", "weight": 40, "score": 90, "detail": "Matches .NET, AWS, PostgreSQL" },
      { "label": "Interest Match", "weight": 20, "score": 95, "detail": "Aligned with AI & Cloud" },
      { "label": "Preferred Role", "weight": 15, "score": 100, "detail": "Exact Backend role match" },
      { "label": "Previous Experience", "weight": 15, "score": 80, "detail": "Direct project evidence found" },
      { "label": "Availability", "weight": 10, "score": 100, "detail": "10/10 weekly hours compatible" }
    ],
    "strongMatches": [".NET", "AWS", "PostgreSQL"],
    "skillGaps": [
      { "skill": "Docker", "note": "Required in sprint 2", "recommendation": "Review container basics in AI Studio" }
    ],
    "explanationSummary": "Based on verified university achievements and GitHub repository evidence, Alex is ranked in the top 8% of candidates for this position."
  }
  ```

### `GET /api/v1/discovery/filters`
- **Mô tả:** Lấy danh sách các Role, Skill và ngưỡng điểm khả dụng trong hệ thống.
- **Response `200 OK`:**
  ```json
  {
    "roles": ["All", "Backend Developer", "Frontend Developer", "AI Engineer", "Cloud Engineer", "Full-stack Developer", "UI/UX Designer"],
    "skills": ["All", ".NET", "React", "AWS", "PostgreSQL", "Python", "TypeScript", "Docker", "LLM", "Next.js"],
    "scoreThresholds": [0, 35, 65, 100]
  }
  ```

---

## 7. NHÓM 6: RECRUITMENT PIPELINE & FUNNEL TRACKING (TIẾN TRÌNH TUYỂN DỤNG)

### `GET /api/v1/pipeline/:entityType/:id`
- **Mô tả:** Lấy trạng thái Funnel hiện tại trên thanh `RECRUITMENT PIPELINE` (1: Recommended -> 2: Interested -> 3: Shortlisted -> 4: Invited -> 5: Team Member).
- **Path Params:**
  - `entityType`: `project` hoặc `candidate`
  - `id`: ID của đối tượng
- **Response `200 OK`:**
  ```json
  {
    "entityId": "proj-1",
    "entityType": "PROJECT",
    "currentStatus": "Recommended",
    "currentStepIndex": 0,
    "history": [
      {
        "status": "Recommended",
        "timestamp": "2026-10-06T08:00:00.000Z",
        "actor": "AI_DISCOVERY_ENGINE"
      }
    ]
  }
  ```

### `POST /api/v1/pipeline/projects/:id/interest`
- **Mô tả:** Đánh dấu bày tỏ quan tâm dự án (Confirm Interest) -> Chuyển funnel sang bước `Interested`.
- **Quyền:** Bearer Token.
- **Response `200 OK`:**
  ```json
  {
    "projectId": "proj-1",
    "currentStatus": "Interested",
    "notificationSentToLead": true
  }
  ```

### `DELETE /api/v1/pipeline/projects/:id/interest`
- **Mô tả:** Hủy quan tâm dự án.
- **Response `200 OK`:** Quay về trạng thái `Recommended`.

### `POST /api/v1/pipeline/candidates/:id/shortlist`
- **Mô tả:** Thêm ứng viên vào Shortlist (Dành cho người tạo/quản lý dự án) -> Chuyển funnel sang `Shortlisted`.
- **Quyền:** Role `USER` (Project Owner / Manager).
- **Response `200 OK`:**
  ```json
  {
    "candidateId": "cand-1",
    "currentStatus": "Shortlisted"
  }
  ```

### `POST /api/v1/pipeline/candidates/:id/invite`
- **Mô tả:** Gửi lời mời trực tiếp kèm thư nhắn mời ứng viên gia nhập -> Chuyển funnel sang `Invited`.
- **Quyền:** Role `USER` (Project Owner / Manager).
- **Request Body:**
  ```json
  {
    "candidateId": "cand-1",
    "projectId": "proj-1",
    "role": "Frontend Developer",
    "invitationMessage": "Hi Linh Tran, I reviewed your verified profile and would like to invite you to discuss our Frontend role for EcoTrack."
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "invitationId": "inv_9921",
    "currentStatus": "Invited",
    "chatConversationId": "conv_linh_tran"
  }
  ```

### `POST /api/v1/pipeline/invitations/:inviteId/accept`
- **Mô tả:** Ứng viên chấp thuận lời mời gia nhập dự án -> Chuyển funnel sang `Team Member`.
- **Quyền:** Bearer Token.
- **Response `200 OK`:**
  ```json
  {
    "projectId": "proj-ecotrack",
    "currentStatus": "Team Member",
    "workspaceUrl": "/team"
  }
  ```

### `POST /api/v1/pipeline/invitations/:inviteId/decline`
- **Mô tả:** Từ chối lời mời gia nhập dự án.
- **Request Body:** `{ "reason": "Conflict in weekly availability schedule" }`
- **Response `200 OK`:** Lời mời đã bị từ chối.

---

## 8. NHÓM 7: MY PROJECTS & WORKSPACE MANAGEMENT (QUẢN LÝ DỰ ÁN & SPRINT)

### `GET /api/v1/projects`
- **Mô tả:** Lấy danh sách toàn bộ dự án với các bộ lọc tìm kiếm.
- **Query Params:** `search`, `category`, `skills`, `difficulty`, `page`, `limit`.
- **Response `200 OK`:** Danh sách dự án.

### `GET /api/v1/projects/:id`
- **Mô tả:** Lấy thông tin chi tiết đầy đủ của một dự án (ProjectDetailModal / WorkspaceProjectDetailModal).
- **Response `200 OK`:** Chi tiết dự án, thành viên, mục tiêu, open positions, sprint metrics.

### `POST /api/v1/projects`
- **Mô tả:** Tạo dự án mới (Dành cho bất kỳ User nào - ActionModal `create` / CreateProject Screen).
- **Quyền:** Role `USER`.
- **Request Body:**
  ```json
  {
    "name": "Smart Campus IoT Hub",
    "description": "Deploy environmental sensor network across academic buildings.",
    "category": "IoT & Embedded Systems",
    "goals": [
      "Install 50 temperature & CO2 sensors in lecture halls",
      "Build real-time MQTT data pipeline",
      "Develop public student web dashboard"
    ],
    "techStack": ["MQTT", "Node.js", "InfluxDB", "React"],
    "availableRoles": ["Hardware Specialist", "Frontend Developer"],
    "weeklyCommitment": 10,
    "duration": "3 months",
    "maxTeamSize": 5
  }
  ```
- **Response `201 Created`:** Object dự án mới kèm ID.

### `PUT /api/v1/projects/:id`
- **Mô tả:** Cập nhật thông số dự án.
- **Quyền:** Project Owner.
- **Response `200 OK`:** Dự án đã cập nhật.

### `DELETE /api/v1/projects/:id`
- **Mô tả:** Xóa hoặc lưu trữ dự án.
- **Quyền:** Project Owner.
- **Response `204 No Content`**.

### `GET /api/v1/projects/my-projects`
- **Mô tả:** Lấy danh sách dự án của người dùng theo tab (Active, Saved, Interested, Invited, Completed).
- **Query Params:** `status=active|saved|interested|invited|completed`.
- **Response `200 OK`:**
  ```json
  {
    "active": [{ "id": "ecotrack", "name": "EcoTrack", "role": "Frontend Developer", "status": "In Progress" }],
    "saved": [{ "id": "campus-cloud", "name": "Campus Cloud" }],
    "interested": [{ "id": "studywise", "name": "StudyWise AI" }],
    "invited": [{ "id": "cloud-desk", "name": "AI Customer Support System" }],
    "completed": []
  }
  ```

### `POST /api/v1/projects/:id/save`
- **Mô tả:** Bookmark / Lưu dự án để xem lại sau (Toggle Save).
- **Quyền:** Bearer Token.
- **Response `200 OK`:** `{ "isSaved": true }`.

### `GET /api/v1/projects/:id/members`
- **Mô tả:** Lấy danh sách thành viên nhóm của dự án.
- **Response `200 OK`:** Danh sách thành viên kèm vai trò và avatar.

### `DELETE /api/v1/projects/:id/members/:userId`
- **Mô tả:** Xóa thành viên khỏi nhóm dự án.
- **Quyền:** Project Owner.
- **Response `200 OK`:** Thành viên đã được gỡ bỏ.

### `GET /api/v1/projects/:id/announcements`
- **Mô tả:** Lấy danh sách thông báo nội bộ dự án.
- **Response `200 OK`:** Mảng bài đăng thông báo.

### `POST /api/v1/projects/:id/announcements`
- **Mô tả:** Đăng thông báo mới cho toàn bộ thành viên nhóm.
- **Request Body:** `{ "content": "Sprint 2 milestone review meeting this Friday at 3PM via Google Meet." }`
- **Response `201 Created`**.

### `GET /api/v1/projects/:id/positions`
- **Mô tả:** Lấy danh sách các vị trí tuyển dụng mở (Open Positions) của dự án.
- **Response `200 OK`:**
  ```json
  [
    {
      "id": "pos_1",
      "title": "Frontend Developer",
      "requiredSkills": ["React", "TypeScript", "Tailwind CSS"],
      "weeklyCommitment": "8-10 hrs/week",
      "status": "OPEN",
      "applicantsCount": 4
    }
  ]
  ```

### `POST /api/v1/projects/:id/positions`
- **Mô tả:** Tạo vị trí tuyển dụng mới (ActionModal `position`).
- **Quyền:** Project Owner.
- **Request Body:**
  ```json
  {
    "title": "UI/UX Designer",
    "requiredSkills": ["Figma", "User Research", "Wireframing"],
    "weeklyCommitment": "6-8 hrs/week"
  }
  ```
- **Response `201 Created`**.

### `DELETE /api/v1/projects/:id/positions/:posId`
- **Mô tả:** Đóng hoặc xóa vị trí tuyển dụng.
- **Response `204 No Content`**.

---

## 9. NHÓM 8: CANDIDATES MANAGEMENT & PIPELINE (DÀNH CHO PROJECT LEADER)

### `GET /api/v1/candidates`
- **Mô tả:** Lấy danh sách ứng viên trong pipeline của Lead (Tabbed: All Candidates, Shortlisted, Invited, Active).
- **Query Params:** `tab=all|shortlisted|invited|active|archived`, `search`, `role`, `minScore`.
- **Response `200 OK`:**
  ```json
  [
    {
      "id": "cand-1",
      "name": "Cao Thanh Nhan",
      "preferredRole": "Backend Developer",
      "university": "FPT University",
      "avatar": "https://cdn.fcaj.community/avatars/nhan.png",
      "matchScore": 92,
      "hours": 10,
      "skills": [".NET", "AWS", "PostgreSQL", "React"],
      "funnelStatus": "Shortlisted"
    }
  ]
  ```

### `GET /api/v1/candidates/:id`
- **Mô tả:** Lấy chi tiết hồ sơ ứng viên (CandidateDetailModal).
- **Response `200 OK`:** Thông tin chi tiết, relevant projects, credentials, availability.

### `POST /api/v1/candidates/:id/archive`
- **Mô tả:** Lưu trữ / ẩn ứng viên khỏi pipeline tìm kiếm.
- **Response `200 OK`:** Ứng viên đã chuyển vào mục lưu trữ.

---

## 10. NHÓM 9: MESSAGING & REALTIME CHAT (TIN NHẮN & GIAO TIẾP)

### `GET /api/v1/messages/conversations`
- **Mô tả:** Lấy danh sách các cuộc hội thoại (Direct Chat & Team Workspace Chat).
- **Quyền:** Bearer Token.
- **Response `200 OK`:**
  ```json
  [
    {
      "id": "conv_minh_nguyen",
      "participantName": "Minh Nguyen",
      "participantAvatar": "https://cdn.fcaj.community/avatars/minh.png",
      "isTeam": false,
      "lastMessage": "Hey Alex! Your experience with .NET and RAG caught my eye...",
      "lastMessageTimestamp": "2026-10-06T09:12:00.000Z",
      "unreadCount": 1,
      "online": true
    },
    {
      "id": "conv_ecotrack_team",
      "participantName": "EcoTrack Team Workspace",
      "participantAvatar": "https://cdn.fcaj.community/avatars/ecotrack.png",
      "isTeam": true,
      "lastMessage": "Sprint 1 milestone deliverables submitted.",
      "lastMessageTimestamp": "2026-10-06T08:30:00.000Z",
      "unreadCount": 0,
      "online": true
    }
  ]
  ```

### `GET /api/v1/messages/conversations/:id/messages`
- **Mô tả:** Lấy lịch sử tin nhắn trong cuộc trò chuyện (Có phân trang cursor).
- **Query Params:** `limit=50`, `beforeMessageId=msg_1092`.
- **Response `200 OK`:**
  ```json
  [
    {
      "id": "msg_01",
      "senderId": "usr_minh",
      "senderName": "Minh Nguyen",
      "body": "Hey Alex! Your experience with .NET and RAG caught my eye.",
      "timestamp": "2026-10-06T09:10:00.000Z",
      "outgoing": false,
      "attachments": []
    },
    {
      "id": "msg_02",
      "senderId": "usr_alex_le",
      "senderName": "Alex Le",
      "body": "Thanks for reaching out! The project sounds really interesting.",
      "timestamp": "2026-10-06T09:12:00.000Z",
      "outgoing": true,
      "attachments": []
    }
  ]
  ```

### `POST /api/v1/messages/conversations/:id/messages`
- **Mô tả:** Gửi tin nhắn mới (REST fallback nếu không dùng WebSocket).
- **Request Body:**
  ```json
  {
    "body": "Here is our database architecture schema.",
    "attachments": [
      {
        "fileName": "architecture-diagram.png",
        "fileUrl": "https://cdn.fcaj.community/uploads/arch.png",
        "fileSize": 1048576
      }
    ]
  }
  ```
- **Response `201 Created`:** Message object mới.

### `PATCH /api/v1/messages/conversations/:id/read`
- **Mô tả:** Đánh dấu toàn bộ tin nhắn trong cuộc hội thoại là đã đọc.
- **Response `200 OK`:** `{ "unreadCount": 0 }`.

### `POST /api/v1/messages/upload`
- **Mô tả:** Tải lên tệp đính kèm trong tin nhắn (Tài liệu PDF, ảnh, code snippets).
- **Payload:** `multipart/form-data` with `file`.
- **Response `200 OK`:** File URL & meta.

### 10.1. WebSocket Events (Real-time Protocol)
- **Kênh kết nối:** `wss://api.tindy.fcaj.community/ws?token=<ACCESS_TOKEN>`
- **Client emit:**
  - `chat:join_room`: `{ "conversationId": "conv_minh_nguyen" }`
  - `chat:send_message`: `{ "conversationId": "...", "body": "Hello!" }`
  - `chat:typing`: `{ "conversationId": "...", "isTyping": true }`
- **Server broadcast:**
  - `chat:message_received`: `{ "id": "msg_99", "senderId": "...", "body": "...", "timestamp": "..." }`
  - `chat:user_typing`: `{ "userId": "usr_minh", "isTyping": true }`
  - `chat:user_status`: `{ "userId": "usr_minh", "status": "ONLINE" | "OFFLINE" }`
  - `notification:new`: `{ "title": "New Team Invite", "time": "Just now" }`

---

## 11. NHÓM 10: NOTIFICATIONS SYSTEM (HỆ THỐNG THÔNG BÁO)

### `GET /api/v1/notifications`
- **Mô tả:** Lấy danh sách thông báo của người dùng theo danh mục.
- **Query Params:** `filter=ALL|INVITATIONS|RECOMMENDATIONS|ANNOUNCEMENTS`, `page=1`, `limit=20`.
- **Response `200 OK`:**
  ```json
  [
    {
      "id": "notif_1",
      "title": "You received a team invitation.",
      "description": "Minh Nguyen invited you to join AI Customer Support System.",
      "category": "INVITATION",
      "targetUrl": "/projects?tab=Invited",
      "actionLabel": "Review invitation",
      "read": false,
      "createdAt": "2026-10-06T09:28:00.000Z"
    },
    {
      "id": "notif_2",
      "title": "Your profile was viewed by a project team.",
      "description": "The AI Customer Support System team is getting to know your experience.",
      "category": "RECOMMENDATION",
      "targetUrl": "/profile",
      "actionLabel": "Inspect views",
      "read": true,
      "createdAt": "2026-10-06T08:15:00.000Z"
    }
  ]
  ```

### `GET /api/v1/notifications/unread-count`
- **Mô tả:** Lấy số lượng thông báo chưa đọc hiển thị ở chấm đỏ thanh Header (`Bell` icon).
- **Response `200 OK`:** `{ "unreadCount": 3 }`.

### `PATCH /api/v1/notifications/:id/read`
- **Mô tả:** Đánh dấu một thông báo cụ thể là đã đọc.
- **Response `200 OK`:** Cập nhật thành công.

### `PATCH /api/v1/notifications/read-all`
- **Mô tả:** Đánh dấu toàn bộ thông báo là đã đọc (Mark all as read).
- **Response `200 OK`:** `{ "readCount": 12 }`.

### `DELETE /api/v1/notifications/:id`
- **Mô tả:** Xóa một thông báo khỏi danh sách.
- **Response `204 No Content`**.

---

## 12. NHÓM 11: AI STUDIO & GENERATIVE COPILOT (CÔNG CỤ THÔNG MINH)

### `POST /api/v1/ai/generate-summary`
- **Mô tả:** Tạo tóm tắt hồ sơ chuyên nghiệp dựa trên kỹ năng, kinh nghiệm và mục tiêu (AI Profile Builder).
- **Quyền:** Bearer Token.
- **Request Body:**
  ```json
  {
    "skills": [".NET", "AWS", "PostgreSQL", "React", "TypeScript", "Git"],
    "experience": "Built a RAG chatbot and a ticket management system using .NET, PostgreSQL, and AWS.",
    "interests": "Cloud computing, AI applications, open source",
    "tone": "PROFESSIONAL_ACADEMIC"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "generatedSummary": "Backend-focused developer with hands-on experience in .NET, AWS, and PostgreSQL. Passionate about building thoughtful AI applications and contributing to collaborative, cloud-first projects.",
    "tokenUsage": { "promptTokens": 142, "completionTokens": 48 }
  }
  ```

### `POST /api/v1/ai/extract-skills`
- **Mô tả:** Tự động phát hiện và trích xuất kỹ năng kỹ thuật từ mô tả văn bản hoặc đề cương dự án (Skill Detector).
- **Request Body:**
  ```json
  {
    "rawText": "We will develop a microservice with ASP.NET Core 8, authenticating users with JWT, storing telemetry in Redis and relational data in PostgreSQL hosted on AWS EC2."
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "detectedSkills": [
      { "category": "Backend", "items": ["ASP.NET Core", "REST API", "JWT"] },
      { "category": "Database", "items": ["PostgreSQL", "Redis"] },
      { "category": "Cloud", "items": ["AWS EC2"] }
    ]
  }
  ```

### `POST /api/v1/ai/draft-project`
- **Mô tả:** AI Copilot hỗ trợ Project Lead sinh mục tiêu sprint, yêu cầu kỹ thuật và phân bổ vai trò từ ý tưởng ban đầu.
- **Request Body:**
  ```json
  {
    "projectName": "Campus Food Saver",
    "domain": "Sustainability",
    "concept": "Reduce cafeteria food waste by notifying students of discounted meals at closing time."
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "suggestedTagline": "Connecting students with campus surplus food in real-time.",
    "suggestedGoals": [
      "Realtime push notification service for campus cafeterias",
      "Student mobile portal for reserving surplus meals",
      "Waste diversion analytics dashboard for university sustainability office"
    ],
    "suggestedRoles": ["Mobile Developer (Flutter)", "Backend Developer (Node.js)", "UI/UX Designer"],
    "recommendedTechStack": ["Flutter", "Node.js", "Firebase", "PostgreSQL"]
  }
  ```

### `GET /api/v1/ai/matching-rules`
- **Mô tả:** Lấy bộ trọng số thuật toán ghép cặp giải thích được (Explainable AI Match Weights).
- **Response `200 OK`:**
  ```json
  [
    { "name": "Technical skills", "weight": 40, "description": "Overlap between candidate skills and required stack" },
    { "name": "Interest match", "weight": 20, "description": "Domain synergy and motivation match" },
    { "name": "Preferred role", "weight": 15, "description": "Target role alignment" },
    { "name": "Previous experience", "weight": 15, "description": "Prior completed projects evidence" },
    { "name": "Availability", "weight": 10, "description": "Weekly commitment compatibility" }
  ]
  ```

---

## 13. NHÓM 12: SETTINGS & ACCOUNT PREFERENCES (CÀI ĐẶT HỆ THỐNG)

### `GET /api/v1/settings/preferences`
- **Mô tả:** Lấy toàn bộ cài đặt thông báo và quyền riêng tư của tài khoản.
- **Quyền:** Bearer Token.
- **Response `200 OK`:**
  ```json
  {
    "email": "alex.le@fpt.edu.vn",
    "role": "User",
    "notifications": {
      "emailNotifications": true,
      "projectInvitations": true,
      "newRecommendations": true,
      "teamAnnouncements": true,
      "weeklyDigest": true
    },
    "privacy": {
      "profileVisibility": "COMMUNITY_ONLY",
      "showAvailability": true,
      "shareEvidenceRepo": true
    }
  }
  ```

### `PUT /api/v1/settings/account`
- **Mô tả:** Cập nhật thông tin định danh tài khoản (Email).
- **Request Body:**
  ```json
  {
    "email": "alex.le@fpt.edu.vn"
  }
  ```
- **Response `200 OK`:** Cập nhật thành công.

### `PUT /api/v1/settings/notifications`
- **Mô tả:** Cập nhật các switch thông báo trong mục Notifications (SettingsScreen).
- **Request Body:**
  ```json
  {
    "emailNotifications": true,
    "projectInvitations": true,
    "newRecommendations": false,
    "teamAnnouncements": true
  }
  ```
- **Response `200 OK`:** Đã lưu thiết lập thông báo.

### `PUT /api/v1/settings/privacy`
- **Mô tả:** Cập nhật tùy chọn bảo mật và quyền riêng tư (Privacy & Security).
- **Request Body:**
  ```json
  {
    "profileVisibility": "COMMUNITY_ONLY",
    "showAvailability": true
  }
  ```
- **Response `200 OK`:** Đã lưu thiết lập bảo mật.

### `PUT /api/v1/settings/security/change-password`
- **Mô tả:** Đổi mật khẩu tài khoản trực tiếp trong Settings.
- **Request Body:**
  ```json
  {
    "currentPassword": "OldPassword123!",
    "newPassword": "NewStrongPassword789!"
  }
  ```
- **Response `200 OK`:** Mật khẩu đã đổi thành công.

### `DELETE /api/v1/settings/account`
- **Mô tả:** Yêu cầu xóa vĩnh viễn tài khoản và dữ liệu cá nhân theo quy định GDPR / PDP.
- **Request Body:** `{ "confirmPassword": "StrongPassword123!" }`
- **Response `200 OK`:** Tài khoản đã được lập lịch xóa.

---

## 14. NHÓM 13: FILE STORAGE & CDN UPLOADS (LƯU TRỮ TỆP)

### `POST /api/v1/storage/upload`
- **Mô tả:** Tải lên tệp chung (Hình ảnh avatar, sơ đồ dự án, tệp đính kèm) với định dạng Multipart.
- **Payload:** `multipart/form-data` with `file`, `folder=avatars|projects|attachments`.
- **Response `201 Created`:**
  ```json
  {
    "fileUrl": "https://cdn.fcaj.community/projects/ecotrack-cover.jpg",
    "fileName": "ecotrack-cover.jpg",
    "mimeType": "image/jpeg",
    "fileSize": 348210
  }
  ```

### `POST /api/v1/storage/presigned-url`
- **Mô tả:** Xin URL ký trước (Presigned S3 URL) để client tải tệp trực tiếp lên cloud storage mà không nghẽn máy chủ API.
- **Request Body:**
  ```json
  {
    "fileName": "alex_cv_2026.pdf",
    "fileType": "application/pdf",
    "fileSize": 2048000
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "uploadUrl": "https://s3.ap-southeast-1.amazonaws.com/tindy-storage/alex_cv_2026.pdf?AWSAccessKeyId=...",
    "publicUrl": "https://cdn.fcaj.community/resumes/alex_cv_2026.pdf"
  }
  ```

---

## 15. NHÓM 14: SYSTEM HEALTH & METADATA (HỆ THỐNG)

### `GET /api/v1/health`
- **Mô tả:** Kiểm tra trạng thái máy chủ, Database, Redis Cache và AI Engine.
- **Response `200 OK`:**
  ```json
  {
    "status": "UP",
    "database": "CONNECTED",
    "redis": "CONNECTED",
    "aiService": "HEALTHY",
    "version": "2.0.0",
    "uptime": "14d 6h 32m"
  }
  ```

### `GET /api/v1/system/constants`
- **Mô tả:** Lấy danh sách trường học đối tác, danh mục ngành học và các cấu hình động.
- **Response `200 OK`:**
  ```json
  {
    "universities": ["FPT University", "VNU-HCM", "RMIT University", "Bach Khoa University"],
    "categories": ["AI & Machine Learning", "Cloud & DevOps", "Web Application", "Mobile App", "Open Source", "Social Impact", "IoT & Embedded Systems"],
    "maxWeeklyCommitment": 40
  }
  ```

---

## TỔNG KẾT BẢNG SỐ LƯỢNG ENDPOINT THEO CHỨC NĂNG

| STT | Nhóm chức năng (Module) | Số lượng Endpoint | Phương thức chính |
|:---:|:---|:---:|:---|
| **1** | Authentication & Access Control | **7** | `POST` |
| **2** | Onboarding Wizard | **3** | `GET, POST` |
| **3** | User Profile & Credentials | **11** | `GET, POST, PUT, DELETE` |
| **4** | Dashboard & Overview Analytics | **4** | `GET` |
| **5** | Discovery Engine & Swipe Deck (AI Matching) | **7** | `GET, POST` |
| **6** | Recruitment Pipeline & Funnel Tracking | **7** | `GET, POST, DELETE` |
| **7** | My Projects & Workspace Management | **14** | `GET, POST, PUT, DELETE` |
| **8** | Candidates Management & Pipeline | **3** | `GET, POST` |
| **9** | Messaging & Realtime Chat | **6 + WebSocket** | `GET, POST, PATCH, WS` |
| **10** | Notifications System | **5** | `GET, PATCH, DELETE` |
| **11** | AI Studio & Generative Copilot | **4** | `GET, POST` |
| **12** | Settings & Account Preferences | **6** | `GET, PUT, DELETE` |
| **13** | File Storage & CDN Uploads | **2** | `POST` |
| **14** | System Health & Constants | **2** | `GET` |
| **TỔNG CỘNG** | **Toàn bộ hệ thống Tindy Platform** | **81 REST Endpoints + 7 WS Events** | **Đầy đủ 100%** |
