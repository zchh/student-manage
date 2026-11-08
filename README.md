# 学生管理系统

教育机构用的招生和上课系统。顾问负责试听、收费、学生建档和分班；教师负责自己班级的课时和签到。学生不登录。

需求原文在 [DESIGN.md](DESIGN.md)。可验收的行为、接口和测试编号在 [docs/SDD.md](docs/SDD.md)。

## 业务流程

```text
咨询 → 顾问登记试听课 → 试听结束
  ├─ 不报名：必须写下原因，之后可以改记录并再次判断
  └─ 报名：登记购课 → 分入固定班级 → 每周上课
        → 教师记录出勤
        → 剩余课时为 1 或 2：标记快用完，由顾问再登记一笔购课
        → 不续费则视为流失
```

剩余课时 = 该课程已购课时 − 状态为「已到」的签到次数。「未到」不扣课时。余额在服务端计算，页面只展示接口返回的结果。

## 角色和页面

| 角色 | 能做的事 | 页面 |
| --- | --- | --- |
| 顾问 | 试听课、消费记录、学生、班级、分班 | `/advisor/trials`、`/advisor/purchases`、`/advisor/students`、`/advisor/classes` |
| 教师 | 查看自己的班和学生、创建课时、编辑课时、删除还没有签到记录的课时、签到、把课时标为请假 | `/teacher/sessions`、`/teacher/students`、`/teacher/attendance` |

登录页是 `/`。两边菜单互不出现。直接打开对方地址会被送回登录页，对应的写接口返回 403。

## 目录

```text
DESIGN.md          需求
docs/SDD.md        规格，测试编号与此对应
backend/           Express API，内存存储与 MySQL 共用同一套服务
frontend/          Next.js 页面
docker-compose.yml MySQL、后端、前端
```

## 环境

- Node.js 22
- 可选：Docker，用于 MySQL 8

## 本地运行

不设置 `MYSQL_HOST` 时，后端使用内存数据，重启后清空。

```bash
cd backend
npm install
npm run dev
```

另开一个终端：

```bash
cd frontend
npm install
npm run dev
```

打开 http://localhost:3000 。后端地址是 http://localhost:4000 。前端通过 `NEXT_PUBLIC_API_URL` 指定后端，默认就是这个地址。

## 使用 MySQL

```bash
docker compose up --build
```

| 服务 | 地址 |
| --- | --- |
| 前端 | http://localhost:3000 |
| 后端 | http://localhost:4000 |
| MySQL | `localhost:3306`，库名 `student_manage`，用户 `root`，密码 `root` |

表在后端首次连接时自动创建，并写入下面的演示账号。生产环境要更换 `JWT_SECRET` 和数据库密码。

## 演示账号

首次启动自动写入。课程类型有「钢琴」「美术」，教师「李老师」教授钢琴。

| 角色 | 账号 | 密码 |
| --- | --- | --- |
| 顾问 | `advisor` | `advisor123` |
| 教师 | `teacher` | `teacher123` |

## 测试

领域测试不连接数据库。

```bash
cd backend
npm test
```

| 文件 | 覆盖 |
| --- | --- |
| `backend/tests/rules.test.ts` | 未买课原因、扣课时、超额签到、快用完、新生 |
| `backend/tests/service.test.ts` | 试听、分班、请假、删除，以及从试听到续费 |
| `backend/tests/http.test.ts` | 登录失败、顾问与教师互相不能调用对方的写接口 |

## 当前不做

[DESIGN.md](DESIGN.md) 里的这些问题还没有实现：中途退款、推迟上课、中途插班、超级管理员和操作日志、教室占用。
