// 申明依赖
const Router = require('koa-router');
const mongoose = require('mongoose');

// 定义凭证
answerSchema = new mongoose.Schema({
  id: String,
  answer: String
});
questionSchema = new mongoose.Schema({
  type: Number,
  stem: String,
  rightAnswers: String,
  choices: [String],
  answers: [answerSchema]
});
testSchema = new mongoose.Schema({
  username: String,
  courseName: String,
  name: String,
  startTime: Date,
  endTime: Date,
  detail: String,
  questions: [questionSchema]
});
const Test = mongoose.model('Test', testSchema);

module.exports = (app, shareData) => {
  // 创建 router
  let router = new Router({ prefix: '/test' });

  // 存入 shareData
  shareData.Test = Test;

  // 后端校验
  testValidator = (ctx) => {
    // 重要元素为空
    if (ctx.request.body == null || ctx.request.body == undefined ||
        ctx.request.body.test == null || ctx.request.body.test == undefined) {
      return false;
    } else {
      let test = ctx.request.body.test;
      let courseName = test.courseName;
      let name = test.name;
      let startTime = test.startTime;
      let endTime = test.endTime;
      let detail = test.detail;
      let questions = test.questions;
      // 非题目的非法请求
      if (courseName == null || courseName == undefined || courseName == '' ||
          name == null || name == undefined || name == '' ||
          startTime == null || startTime == undefined || startTime < new Date() ||
          endTime == null || endTime == undefined || endTime < startTime ||
          detail == null || detail == undefined) {
        return false;
      } else {
        // 校验题目中的非法请求
        let isValid = true;
        questions.forEach((question) => {
          // 如果为选择题
          if (question.type == 1 || question.type == 2) {
            // 校验选项是否为空
            question.choices.forEach((choice) => {
              if (choice == '' || choice == null || choice == undefined) isValid = false;
            });
            // 校验题干是否为空
            if (question.stem == '' || question.stem == null || question.stem == undefined)
              isValid = false;
            // 校验答案是否为空
            if (question.rightAnswers == '' || question.rightAnswers == null ||
                question.rightAnswers == undefined)
              isValid == false;
          // 如果为填空题
          } else if (question.type == 3) {
            if (question.stem == '' || question.stem.indexOf('[空]') < 0)
              isValid = false;
          // 如果为简答题
          } else if (question.type == 4) {
            if (question.stem == '') isValid = false;
          }
        });
        return isValid;
      }
    }
  }

  // 获取测试
  router.post('/get-tests', async (ctx, next) => {
    try {
      // 若请求不包含用户名，则未授权
      if (ctx.session.username == null || ctx.session.username == undefined) {
        ctx.body = { isOK: false, message: '401' };
      } else if (ctx.request.body == null || ctx.request.body == undefined ||
                 ctx.request.body.course == null || ctx.request.body.course == undefined) {
        ctx.status = 403;
      } else {
        // 从请求中取出课程名
        let course = ctx.request.body.course;
        // 通过 course 查找测试
        let tests = await Test.find({ username: ctx.session.username,
                                      courseName: course });
        let queryTests = [];
        tests.forEach((test) => {
          queryTests.push({
            name: test.name,
            startTime: test.startTime,
            endTime: test.endTime,
            detail: test.detail,
            questions: test.questions
          });
        });
        ctx.body = { isOK: true, tests: queryTests };
      }
    } catch(error) {
      console.error(error);
    }
  });

  // 获取单个测试
  router.post('/get-test', async (ctx, next) => {
    try {
      // 后端校验
      if (ctx.request.body == null || ctx.request.body == undefined ||
          ctx.request.body.course == null || ctx.request.body.course == undefined ||
          ctx.request.body.test == null || ctx.request.body.test == undefined ||
          ctx.request.body.username == null || ctx.request.body.username == undefined) {
        ctx.status = 403;
      } else {
        // 从请求中取出课程名和测试名
        let course = ctx.request.body.course;
        let test = ctx.request.body.test;
        let username = ctx.request.body.username;
        // 通过 course 查找测试
        let tests = await Test.find({ username: username, courseName: course,
                                      name: test });
        let isAuth = ctx.session.username != null && ctx.session.username != undefined;
        let questions = [];
        if (!isAuth) {
          for (let question of tests[0].questions) {
            questions.push({
              type: question.type,
              stem: question.stem,
              choices: question.choices
            });
          }
        } else {
          for (let question of tests[0].questions) {
            questions.push({
              type: question.type,
              stem: question.stem,
              rightAnswers: question.rightAnswers,
              answers: question.answers,
              choices: question.choices
            });
          }
        }
        ctx.body = {
          isOK: isAuth,
          name: tests[0].name,
          startTime: tests[0].startTime,
          endTime: tests[0].endTime,
          detail: tests[0].detail,
          questions: questions
        }
      }
    } catch(error) {
      console.error(error);
    }
  });

  // 创建测验
  router.post('/create-test', async (ctx, next) => {
    try {
      // 若请求不包含用户名，则未授权
      if (ctx.session.username == null || ctx.session.username == undefined) {
        ctx.body = { isOK: false, message: '401' };
      // 后端校验
      } else if (!testValidator(ctx)) {
        ctx.status = 403;
      // 正常情况
      } else {
        let raw = ctx.request.body.test;
        // 检查该测试是否已存在
        let tests = await Test.find({ username: ctx.session.username,
                                      courseName: raw.courseName,
                                      name: raw.name });
        if (tests.length == 0) {
          // 创建新的 test 框架
          let test = new Test({
            username: ctx.session.username,
            courseName: raw.courseName,
            name: raw.name,
            startTime: raw.startTime,
            endTime: raw.endTime,
            detail: raw.detail,
            questions: []
          });
          // 将问题放入 test
          raw.questions.forEach((question, index) => {
            test.questions[index] = {
              type: question.type,
              stem: question.stem,
              choices: question.choices,
              rightAnswers: question.rightAnswers,
              answers: []
            };
          });
          await test.save();
          ctx.body = { isOK: true };
        } else {
          ctx.body = { isOK: false, message: '该测试已存在，请使用其他的测试名' };
        }
      }
    } catch(error) {
      console.error(error);
    }
  });

  // 更新测试
  router.post('/update-test', async (ctx, next) => {
    try {
      // 若请求不包含用户名，则未授权
      if (ctx.session.username == null || ctx.session.username == undefined) {
        ctx.body = { isOK: false, message: '401' };
      // 后端校验
      } else if (!testValidator(ctx) ||
                 ctx.request.body.oldName == null || ctx.request.body.oldName == undefined) {
        ctx.status = 403;
      // 正常情况
      } else {
        let raw = ctx.request.body.test;
        let tests = await Test.find({ username: ctx.session.username,
                                      courseName: raw.courseName,
                                      name: ctx.request.body.oldName });
        let tests_ = await Test.find({ username: ctx.session.username,
                                       courseName: raw.courseName,
                                       name: raw.name });
        // 测试名未被占用
        if (tests_.length == 0 || ctx.request.body.oldName == raw.name) {
          // 更新该测试
          let test = tests[0];
          test.name = raw.name;
          test.detail = raw.detail;
          test.startTime = raw.startTime;
          test.endTime = raw.endTime;
          test.questions = [];
          // 将问题放入 test
          raw.questions.forEach((question, index) => {
            test.questions[index] = {
              type: question.type,
              stem: question.stem,
              choices: question.choices,
              rightAnswers: question.rightAnswers,
              answers: []
            }
          });
          await test.save();

          ctx.body = {
            isOK: true,
            name: test.name,
            detail: test.detail,
            startTime: test.startTime,
            endTime: test.endTime,
            questions: test.questions
          };
        // 该测试存在
        } else {
          ctx.body = { isOK: false, message:'已存在同名测试' };
        }
      }
    } catch(error) {
      console.error(error);
    }
  });

  // 删除测试
  router.post('/delete-test', async (ctx, next) => {
    try {
      // 若请求不包含用户名，则未授权
      if (ctx.session.username == null || ctx.session.username == undefined) {
        ctx.body = { isOK: false, message: '401' };
      } else if (ctx.request.body == null || ctx.request.body == undefined ||
        ctx.request.body.course == null || ctx.request.body.course == undefined ||
        ctx.request.body.test == null || ctx.request.body.test == undefined) {
        ctx.status = 403;
      } else {
        // 通过 course 和 testName 查找需要删除的测试
        let tests = await Test.find({ username: ctx.session.username,
                                      courseName: ctx.request.body.course,
                                      name: ctx.request.body.test});
        let test = tests[0];
        await test.remove();
        ctx.body = { isOK: true };
      }
    } catch(error) {
      console.error(error);
    }
  });

  // 提交学生成绩
  router.post('/submit-answers', async (ctx, next) => {
    try {
      // 若请求不包含用户名，则未授权
      if (ctx.request.body == null || ctx.request.body == undefined ||
          ctx.request.body.username == null || ctx.request.body.username == undefined ||
          ctx.request.body.course == null || ctx.request.body.course == undefined ||
          ctx.request.body.testName == null || ctx.request.body.testName == undefined ||
          ctx.request.body.studentId == null || ctx.request.body.studentId == undefined ||
          ctx.request.body.studentAnswers == null || ctx.request.body.studentAnswers == undefined) {
         ctx.status = 403;
      } else {
        // 通过 course 和 testName 查找需要删除的测试
        let tests = await Test.find({ username: ctx.request.body.username,
                                      courseName: ctx.request.body.course,
                                      name: ctx.request.body.testName});
        let test = tests[0];
        ctx.request.body.studentAnswers.forEach((studentAnswer, index) => {
          let exit = false;
          for (let answer of test.questions[index].answers) {
            if (answer.id == ctx.request.body.studentId) {
              exit = true;
              answer.answer = studentAnswer;
            }
          }
          if (exit == false) {
            test.questions[index].answers.push({ id: ctx.request.body.studentId,
                                                 answer: studentAnswer });
          }
        });
        await test.save();
        ctx.body = { isOK: true };
      }
    } catch(error) {
      console.error(error);
    }
  });

  // 在 app 中打入 routes
  app.use(router.routes());
  app.use(router.allowedMethods());

  return router;
}
