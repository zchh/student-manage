import { createMysqlStore } from "./db/mysql.js";
import { seedBulk } from "./store/bulk-seed.js";
import { seedDemo } from "./store/seed.js";

let store;
try {
  store = await createMysqlStore();
} catch (error) {
  const code = (error as { code?: string }).code;
  if (code === "ER_ACCESS_DENIED_ERROR") {
    console.error("数据库拒绝登录。请设置本机 MySQL 的账号密码后再执行 npm run seed。");
    console.error('示例：$env:MYSQL_PASSWORD="你的密码"; npm run seed');
    process.exit(1);
  }
  if (code === "ER_BAD_DB_ERROR") {
    console.error("数据库 student_manage 不存在。请先创建该库，或用 docker compose up mysql 启动项目数据库。");
    process.exit(1);
  }
  throw error;
}
await seedDemo(store);
const result = await seedBulk(store);
if (!result) {
  console.log("测试数据已存在，未重复写入");
  process.exit(0);
}
console.log(`已写入顾问 ${result.advisors.length}、教师 ${result.teachers.length}、班级 ${result.classes.length}、学生 ${result.studentCount}`);
for (const advisor of result.advisors) console.log(`顾问 ${advisor.name} 账号 ${advisor.account} 密码 advisor123`);
for (const teacher of result.teachers) console.log(`教师 ${teacher.name} 账号 ${teacher.account} 密码 teacher123`);
for (const item of result.classes) {
  console.log(`班级 ${item.name} ${item.weekday} ${item.timeRange} 学生 ${item.studentCount}`);
}
process.exit(0);
