# 学生管理系统规格（SDD + TDD）

本文是开发规格，不是补充需求。`DESIGN.md` 里的业务流程、数据模型和页面是输入；本文把它们收成可以验收的行为。测试文件里的 `SPEC-*` 编号与这里一一对应。先有规格和测试，再写实现。版本迭代在`docs/version.md`中。

## 1. 开发方式

1. 规格写清角色、输入、结果和失败条件。
2. 测试用同样的编号描述这些行为，先约束领域服务，再约束 HTTP 的登录和角色隔离。
3. 实现只为通过这些测试。页面调用同一套 API，不另写一套规则。
4. 余额、能否分班、能否签到都在服务端计算。前端只展示服务端返回的结果。

运行测试：

```bash
cd backend
npm install
npm test
```

## 2. 范围

系统服务教育机构的招生和上课。人物有三类：教务（下称顾问）、教师、学生。

登录角色只有顾问和教师。学生不登录，由顾问建档。需求里的「教务」和「课程顾问」是同一角色。

本次不做：退款、教室占用、操作日志、超级管理员。需求正文没有这些行为。

## 3. 主路径

```text
咨询 → 顾问登记试听课 → 教师上试听课 → 试听结束
  ├─ 不报名：必须写下原因，之后可以改记录并再次判断
  └─ 报名：顾问登记购课 → 分入固定班级 → 每周上课
        → 教师记录出勤
        → 剩余课时大于 2：继续上课
        → 剩余课时为 1 或 2：标记快用完，由顾问再登记一次购课（续费）
```

试听课「已买课」只表示意向。真正增加课时的动作是消费记录。分班前，学生必须已经购买该班的课程类型。

## 4. 行为规格

### 登录与权限

| 编号 | 行为 |
| --- | --- |
| SPEC-AUTH-01 | 提交账号、密码、角色。密码不匹配时拒绝，不签发令牌。 |
| SPEC-AUTH-02 | 只在所选角色的账号表里核对。顾问账号不能以教师身份登录。 |
| SPEC-PERM-01 | 教师调用顾问的写接口时返回 403，数据不变。 |
| SPEC-PERM-02 | 顾问调用教师的课时、签到接口时返回 403，数据不变。 |

顾问可以：试听课、消费记录、学生、班级、把学生分进班级。

教师可以：查看自己的班级和学生、创建自己班级的课时、给学生签到、把课时标为请假。

未登录访问业务接口返回 401。

### 试听课

| 编号 | 行为 |
| --- | --- |
| SPEC-TRIAL-01 | 「是否买课」为否时，备注必须写下没买的原因，否则拒绝保存。 |
| SPEC-TRIAL-02 | 顾问可以修改试听课，包括之后改为已买课。 |
| SPEC-TRIAL-03 | 试听课的课程类型必须与所选教师的课程类型一致。 |

### 课时

剩余课时 = 该生在该课程类型上的购买课时合计 − 状态为「已到」的签到次数。已完成课时就是「已到」次数。不单独存余额，避免和签到记录不一致。

| 编号 | 行为 |
| --- | --- |
| SPEC-HOUR-01 | 顾问登记消费后，对应课程的剩余课时增加所购课时。课时必须是正整数。 |
| SPEC-HOUR-02 | 签到「已到」使剩余课时减 1。「未到」不减。 |
| SPEC-HOUR-03 | 这次记为「已到」会让已到次数超过已购课时时，拒绝签到。 |
| SPEC-HOUR-04 | 剩余课时为 1 或 2 时标记「快用完」。为 0 或大于 2 时不标记。续费就是再记一笔消费。 |

学生已分班时，列表上的课时按该班课程类型计算。未分班时，按全部课程合计。

### 班级与课时

| 编号 | 行为 |
| --- | --- |
| SPEC-CLASS-01 | 学生没有购买该班课程类型的课时时，不能分入该班。 |
| SPEC-CLASS-02 | 一个学生同时只能在一个班级。 |
| SPEC-CLASS-03 | 创建班级时，教师自己的课程类型必须和班级课程类型一致。 |
| SPEC-SESSION-01 | 教师只能为自己任教的班级创建课时。 |
| SPEC-SESSION-02 | 课时状态为「教师请假」时不能签到。已有签到记录时不能再改成请假。 |
| SPEC-ATTEND-01 | 该课程已完成课时为 0 的学生，签到页标为新生。 |
| SPEC-STUDENT-01 | 已分班或已有签到的学生不能删除。 |

课时状态只允许：待上课、教师请假、已完成。提交签到后，待上课变为已完成。

### 主路径

| 编号 | 行为 |
| --- | --- |
| SPEC-FLOW-01 | 顾问登记未买课原因 → 改为已买课 → 建学生 → 购课 → 分班 → 教师建课时并签到「已到」→ 剩余课时减少 → 再购课后续费。教师不能代替顾问建学生。 |

## 5. 数据模型

表与 `DESIGN.md` 一致。页面比表多出的试听字段一并保存：学生性别、出生年月日、计划报名时间。

| 表 | 实现 |
| --- | --- |
| 教务表 | `advisors` |
| 教师表 | `teachers`，含课程类型 |
| 学生表 | `students`，学号由系统生成，形如 `S0001` |
| 课程顾问与学生关系表 | `advisor_students`，建学生时写入当前顾问 |
| 消费记录表 | `purchases` |
| 试听课表 | `trials` |
| 课程类型表 | `course_types` |
| 班级表 | `classes` |
| 班级学生表 | `class_students` |
| 班级课时表 | `class_sessions` |
| 签到表 | `attendances`，同一课时同一学生只有一条，重复提交则更新 |

密码只存哈希。接口响应不返回密码。

## 6. API

基础地址 `http://localhost:4000`。除登录和健康检查外，请求头带 `Authorization: Bearer <token>`。

| 方法 | 路径 | 角色 |
| --- | --- | --- |
| POST | `/api/auth/login` | 公开。体：`account`、`password`、`role`（`advisor` 或 `teacher`） |
| GET | `/api/health` | 公开 |
| GET | `/api/course-types` | 已登录 |
| GET | `/api/teachers` | 顾问 |
| GET/POST | `/api/trials` | 顾问 |
| PUT | `/api/trials/:id` | 顾问 |
| GET/POST | `/api/students` | 顾问。查询参数 `keyword` |
| DELETE | `/api/students/:id` | 顾问 |
| GET/POST | `/api/purchases` | 顾问。查询参数 `keyword` 匹配学生姓名 |
| GET/POST | `/api/classes` | 顾问 |
| POST | `/api/classes/:id/students` | 顾问。体：`studentId` |
| GET | `/api/classes/:id/sessions` | 顾问，课时查看 |
| GET | `/api/teacher/classes` | 教师，只返回自己的班 |
| GET | `/api/teacher/classes/:id/students` | 教师 |
| GET/POST | `/api/teacher/classes/:id/sessions` | 教师。POST 创建课时 |
| PATCH | `/api/teacher/sessions/:id` | 教师，修改状态 |
| GET/POST | `/api/teacher/sessions/:id/attendance` | 教师。POST 体：`{ items: [{ studentId, status, remark }] }` |

失败时返回 `{ "error": "原因", "code": "SPEC-..." }`。

## 7. 页面对应

| 页面 | 路径 | 使用的规格 |
| --- | --- | --- |
| 登录 | `/` | SPEC-AUTH-01、SPEC-AUTH-02 |
| 试听课 | `/advisor/trials` | SPEC-TRIAL-01、SPEC-TRIAL-02、SPEC-TRIAL-03 |
| 消费记录 | `/advisor/purchases` | SPEC-HOUR-01、SPEC-HOUR-04 |
| 学生 | `/advisor/students` | SPEC-STUDENT-01、课时合计 |
| 班级 | `/advisor/classes` | SPEC-CLASS-01、SPEC-CLASS-02、SPEC-CLASS-03 |
| 班级课时 | `/teacher/sessions` | SPEC-SESSION-01、SPEC-SESSION-02 |
| 班级学生 | `/teacher/students` | 只读，含课时与顾问 |
| 签到 | `/teacher/attendance` | SPEC-HOUR-02、SPEC-HOUR-03、SPEC-ATTEND-01 |

顾问页面和教师页面互相不放入口。前端根据登录角色拦截地址，服务端仍然按角色拒绝，避免只靠页面隐藏。

## 8. 测试追溯

| 测试文件 | 覆盖 |
| --- | --- |
| `backend/tests/rules.test.ts` | 纯规则：备注、余额、快用完、签到是否超额 |
| `backend/tests/service.test.ts` | SPEC-TRIAL 到 SPEC-FLOW 的服务行为 |
| `backend/tests/http.test.ts` | SPEC-AUTH、SPEC-PERM，以及试听接口的 400 |

领域测试使用内存存储，不依赖 MySQL。MySQL 只在 Docker 运行时接入，业务规则与内存实现共用同一个服务。

## 9. 运行

演示账号（首次启动自动写入）：

| 角色 | 账号 | 密码 |
| --- | --- | --- |
| 顾问 | `advisor` | `advisor123` |
| 教师 | `teacher` | `teacher123` |

课程类型会写入「钢琴」「美术」。教师「李老师」教授钢琴。

本地不用数据库时，后端使用内存数据，重启后数据清空：

```bash
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev
```

打开 `http://localhost:3000`。

使用 MySQL：

```bash
docker compose up --build
```

MySQL 端口 `3306`，根密码 `root`，库名 `student_manage`。后端 `4000`，前端 `3000`。生产环境应更换 `JWT_SECRET` 和数据库密码。

## 10. 技术栈

- 前端：React、Next.js、TypeScript
- 后端：Node.js、TypeScript、Express
- 数据库：MySQL 8
- 部署：Docker Compose
