import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { MdSnackBar } from '@angular/material';

import { UserService } from '../../services/user/user.service';
import { User } from '../../services/user/user';
import { Question } from '../../services/test/question';
import { Test } from '../../services/test/test';
import { TestService } from '../../services/test/test.service';

@Component({
  selector: 'app-add-test',
  templateUrl: './add-test.component.html',
  styleUrls: ['./add-test.component.sass']
})
export class AddTestComponent implements OnInit {
  user: User;  // 当前登录用户，用于身份校验和页面跳转
  courseName: string;  // 课程名

  // 试卷相关变量
  testTitle: string = '';  // 考试的标题
  testDetail: string = '';  // 考试的详情
  startDate: Date = new Date();  // 考试开始时间
  endDate: Date = new Date();  // 考试结束时间
  startHour: string;  // 小时
  endHour: string;
  hours = [];
  startMin: string;  // 分钟
  endMin: string;
  minutes = [];
  questions: Question[] = [];  // 试题
  newQuestion: Question = new Question(1, '', [], [], '');  // 正在创建的新试题
  testErr: string = '';  // 创建试卷时的报错信息

  // 试题相关变量
  indices = ['A.', 'B.', 'C.', 'D.', 'E.', 'F.'];  // 选择题选项字母
  choices = [{ value: '' }, { value: '' }];  // 选项
  tempChoices = [];
  questionErr: string = '';  // 添加新问题时的报错信息
  editedQuestionErr: string = ''; // 编辑问题提交时的报错信息
  singleAnswers: number = 0;  // 新问题的单选答案
  tempSingleAnswers: number = 0;  // 被修改的问题的单选答案
  multiAnswers: boolean[] = [true];  // 新问题的多选答案
  tempMultiAnswers: boolean[] = [true];  // 被修改的问题的多选答案

  // 编辑页面
  editHide: boolean[] = [];  // 是否显示编辑界面
  isEdit: boolean = false;  // 是否被编辑
  oldName: string;  // 旧测试名

  isLoaded: boolean = false;

  constructor(public userService: UserService, public router: Router,
              public snackBar: MdSnackBar, public activatedRoute: ActivatedRoute,
              public testService: TestService) {
    this.isLoaded = false;
    // 如果用户未登录，则跳转到注册登录页面
    userService.getUser().subscribe((data) => {
      this.isLoaded = true;
      if (data.isOK)
        this.user = new User(data.username, data.avatar,
                             data.university, data.school);
      else
        router.navigate(['/login', 'sign-in']);
    });
    // 填充 hours 和 minutes
    for (let i = 6; i <= 22; i++) this.hours.push(i + ' 点');
    for (let i = 0; i <= 59; i++) this.minutes.push(i + ' 分');
    this.startHour = '9 点'; this.endHour = '10 点';
    this.startMin = '30 分'; this.endMin = '15 分';
  }

  ngOnInit() {
    // 从 URL 中读取参数
    this.activatedRoute.params.subscribe((params: Params) => {
      // 取回课程信息
      this.courseName = params['course'];
      // 如果是编辑页面，加载试题信息
      if (params['test'] != undefined && params['test'] != null)
        this.isEdit = true;
      if (this.isEdit) {
        this.testService.getTest(params['course'], params['test'], params['username']).subscribe((data) => {
          if (data.isOK) {
            this.oldName = data.name;
            this.testTitle = data.name;
            this.testDetail = data.detail;
            this.startDate = new Date(data.startTime);
            this.endDate = new Date(data.endTime);
            this.startHour = (this.startDate.getHours()).toString() + ' 点';
            this.endHour = (this.endDate.getHours()).toString() + ' 点';
            this.startMin = (this.startDate.getMinutes()).toString() + ' 分';
            this.endMin = (this.endDate.getMinutes()).toString() + ' 分';
            for (let i = 0; i < data.questions.length; i++) {
              this.questions.push(new Question(data.questions[i].type, data.questions[i].stem,
                                  data.questions[i].choices, data.questions[i].answers,
                                  data.questions[i].rightAnswers));
              this.editHide.push(true);
            }
          } else {
            this.router.navigate(['/login', 'sign-in']);
          }
        });
      }
    });
  }

  // 添加新的选项
  addNewChoice() {
    if (this.choices.length >= 6) {
      this.snackBar.open('选择题选项不能超过 6 个', '知道了', { duration: 2000 });
      return;
    }
    this.choices.push({ value: '' });
  }

  // 删除某个选项
  deleteChoice(index: number) {
    if (this.choices.length <= 2) {
      this.snackBar.open('选择题选项不能少于两个', '知道了', { duration: 2000 });
      return;
    }
    this.choices.splice(index, 1);
    this.multiAnswers.splice(index, 1);
  }

  // 清空报错信息
  clear() {
    this.newQuestion = new Question(1, '', [], [], '');
    this.questionErr = '';
    this.choices = [{ value: '' }, { value: '' }];
  }

  // 对提交的题目信息进行校验
  checkSubmitQuestion(type, choices, stem) {
    let error = '';
    if (type == 1 || type == 2) {
      if (stem == '')
        error = '选择题题干不能为空';
      choices.forEach((choice, index) => {
        // 去除空格
        choice.value = choice.value.replace(/\s/g, '');
        if (choice.value == '')
          error = '选择题选项不能为空，选项 ' + this.indices[index] + ' 为空';
      });
      let sortedChoices = [];
      choices.forEach((choice) => {
        sortedChoices.push(choice.value);
      });
      sortedChoices.sort();
      for (let i = 0; i < sortedChoices.length - 1; i++) {
        if (sortedChoices[i + 1] == sortedChoices[i]) {
          error = '选择题选项有重复';
          break;
        }
      }
    } else if (type == 3) {
      if (stem == '')
        error = '填空题题干不能为空';
      else if (stem.indexOf('[空]') < 0)
        error = '填空题题干中至少需要包含一个空';
    } else if (type == 4) {
      if (stem == '')
        error = '简答题题干不能为空';
    }
    return error;
  }

  // 提交新的问题
  submitQuestion() {
    this.questionErr = this.checkSubmitQuestion(this.newQuestion.type, this.choices,
                                                this.newQuestion.stem);
    // 添加正确答案
    if (this.newQuestion.type == 1)
      this.newQuestion.rightAnswers = this.choices[this.singleAnswers].value;
    else if (this.newQuestion.type == 2) {
      this.newQuestion.rightAnswers = '';
      for (let i = 0; i < this.multiAnswers.length; i++) {
        if (this.multiAnswers[i])
          this.newQuestion.rightAnswers += (this.choices[i].value + ' ');
      }
    }
    if (this.questionErr != '') return;
    // 为题目添加选项
    this.choices.forEach((choice) => {
      this.newQuestion.choices.push(choice.value);
    });
    // 清空
    this.choices = [{ value: '' }, { value: '' }];
    this.questions.push(this.newQuestion);
    this.newQuestion = new Question(1, '', [], [], '');
    this.editHide.push(true);
    this.singleAnswers = 0;
    this.multiAnswers = [true];
  }

  // 删除某个问题
  deleteQuestion(index: number) {
    this.questions.splice(index, 1);
  }

  // 重新编译题干
  compileStem(type, stem) {
    if (type == 3) {
      return stem.replace('[空]', ' _____ ');
    } else {
      return stem;
    }
  }

  // 修改某个问题
  editQuestion(index: number) {
    for (let edit of this.editHide) {
      if (!edit) {
        this.snackBar.open('请完成当前正在编辑的修改', '知道了', { duration: 2000 });
        return;
      }
    }
    this.editHide[index] = false;
    this.tempChoices = [];
    for (let i = 0; i < this.questions[index].choices.length; i++) {
      this.tempChoices.push({value: this.questions[index].choices[i]});
      // 为单选题添加正确答案
      if (this.questions[index].type == 1 &&
          this.questions[index].rightAnswers == this.questions[index].choices[i]) {
        this.tempSingleAnswers = i;
      } else if (this.questions[index].type == 2) {
        if (this.questions[index].rightAnswers.split(' ').indexOf(this.questions[index].choices[i]) >= 0)
          this.tempMultiAnswers[i] = true;
      }
    }
  }

  // 清空编辑时的报错信息
  editClear(index: number) {
    this.editedQuestionErr = '';
    this.tempChoices = [{ value: '' }, { value: '' }];
    this.questions[index].stem = "";
  }

  // 删除编辑时的报错信息
  deleteEditchoice(index: number) {
    if (this.tempChoices.length <= 2) {
      this.snackBar.open('选择题选项不能少于两个', '知道了', { duration: 2000 });
      return;
    }
    this.tempChoices.splice(index, 1);
    this.tempMultiAnswers.splice(index, 1);
  }

  // 添加新的选项
  addNewEditChoice() {
    if (this.tempChoices.length >= 6) {
      this.snackBar.open('选择题选项不能超过 6 个', '知道了', { duration: 2000 });
      return;
    }
    this.tempChoices.push({ value: '' });
  }

  // 上移某题
  moveUp(index: number) {
    let temp = this.questions[index - 1];
    this.questions[index - 1] = this.questions[index];
    this.questions[index] = temp;
  }

  // 下移某题
  moveDown(index: number) {
    let temp = this.questions[index + 1];
    this.questions[index + 1] = this.questions[index];
    this.questions[index] = temp;
  }

  // 提交某个编译好了的问题
  submitEditedQuestion(index) {
    this.editedQuestionErr = this.checkSubmitQuestion(this.questions[index].type, this.tempChoices,
                                                      this.questions[index].stem);
    // 添加正确答案
    if (this.questions[index].type == 1) {
      this.questions[index].rightAnswers = this.tempChoices[this.tempSingleAnswers].value;
    } else if (this.questions[index].type == 2) {
      this.questions[index].rightAnswers = '';
      for (let i = 0; i < this.tempMultiAnswers.length; i++) {
        if (this.tempMultiAnswers[i])
          this.questions[index].rightAnswers += (this.tempChoices[i].value + ' ');
      }
    }
    if (this.editedQuestionErr != '') return;

    this.questions[index].choices = [];
    // 为题目添加选项
    this.tempChoices.forEach((choice) => {
      this.questions[index].choices.push(choice.value);
    });
    // 清空
    this.tempChoices = [{ value: '' }, { value: '' }];
    this.editHide[index] = true;
  }

  // 创建新的试题
  createTest(isNew: boolean) {
    // 截取出数字
    let startHour: number = parseInt(this.startHour.split(' ')[0]);
    let endHour: number = parseInt(this.endHour.split(' ')[0]);
    let startMin: number = parseInt(this.startMin.split(' ')[0]);
    let endMin: number = parseInt(this.endMin.split(' ')[0]);
    // 设置时间
    this.startDate.setHours(startHour, startMin, 0, 0);
    this.endDate.setHours(endHour, endMin, 0, 0);

    // 校验
    let present = new Date();
    if (this.endDate < this.startDate)
      this.testErr = '考试开始时间需在结束时间之前';
    else if (this.endDate < present)
      this.testErr = '考试结束时间需在当前之后';
    else if (this.testTitle == '')
      this.testErr = '试题标题不能为空';
    else
      this.testErr = '';
    if (this.testErr != '') return;

    // 创建试题对象
    let newTest: Test = new Test(this.courseName, this.testTitle, this.startDate,
                                 this.endDate, this.testDetail, this.questions);
    // 判断是创建新的试题还是更新试题
    if (isNew) {
      this.testService.createTest(newTest).subscribe((data) => {
        if (data.isOK) {
          this.snackBar.open('测试创建成功', '知道了', { duration: 2000 });
          this.router.navigate(['/course', this.user.username, this.courseName]);
        } else {
          this.testErr = data.message;
        }
      });
    } else {
      this.testService.updateTest(newTest, this.oldName).subscribe((data) => {
        if (data.isOK) {
          this.snackBar.open('测试更新成功', '知道了', { duration: 2000 });
          this.router.navigate(['/course', this.user.username, this.courseName]);
        } else {
          this.testErr = data.message;
        }
      });
    }
  }

}
