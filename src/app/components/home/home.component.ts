import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MdSnackBar } from '@angular/material';

import { UserService } from '../../services/user/user.service';
import { User } from '../../services/user/user';
import { Validator } from '../../services/user/Validator';
import { CourseService } from '../../services/course/course.service';
import { Course } from '../../services/course/course';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.sass']
})
export class HomeComponent implements OnInit {
  errorMessage: string = '';
  user: User;
  validator: Validator = new Validator();
  courses: Course[];
  isLoaded: boolean = false;

  constructor(public userService: UserService, public router: Router,
              public snackBar: MdSnackBar, public courseService: CourseService) {
    this.isLoaded = false;
    userService.getUser().subscribe((data) => {
      this.isLoaded = true;
      if (data.isOK) {
        this.user = new User(data.username, data.avatar, data.university, data.school);
        this.courseService.getCourses().subscribe((data_) => {
          if (data_.isOK) this.courses = data_.courses;
        });
      } else {
        router.navigate(['/login', 'sign-in']);
      }
    });
  }

  ngOnInit() {}

  avatarChange(event) {
    let reader = new FileReader();

    reader.onload = (e: any) => {
      this.user.avatar = e.target.result;
    };

    if (event.target.files[0] != undefined)
      reader.readAsDataURL(event.target.files[0]);
  }

  updateUserInfo(infoData) {
    const oldName = this.user.username;
    let tempUser = new User(infoData.username, this.user.avatar,
                            infoData.university, infoData.school);
    // 提交修改
    let errorMessage = this.validator.checkUserInfo(this.user.avatar,infoData.username,
                                                    infoData.university, infoData.school);
    if (errorMessage != '') {
      this.errorMessage = errorMessage;
      return;
    }
    // 从后端更新用户数据
    this.userService.updateUser(tempUser, oldName).subscribe((data) => {
      // 无报错信息
      if (!data.message) {
        this.user = data;
        this.errorMessage = '';
        this.snackBar.open('修改成功', '知道了', { duration: 2000 });
      // 有报错信息
      } else {
        if (data.message == '401') {
          this.snackBar.open('凭证已过期，请重新登录', '知道了', { duration: 2000 });
          this.router.navigate(['/login', 'sign-in']);
        } else {
          this.errorMessage = data.message;
        }
      }
    });
  }

  // 删除课程
  deleteCourse(courseName) {
    this.courseService.deleteCourse(courseName).subscribe((data) => {
      if (data.isOK) {
        // 删除前端数据
        for (let i = 0; i < this.courses.length; i++) {
          if (this.courses[i].name == courseName)
            this.courses.splice(i, 1);
        }
        // 显示提示信息
        this.snackBar.open('删除成功', '知道了', { duration: 2000 });
      } else {
        this.snackBar.open('删除失败，请刷新重试', '知道了', { duration: 2000 });
      }
    });
  }

  // 跳转到课程页面
  gotoCourse(course) {
    if (this.user != null)
      this.router.navigate(['/course', this.user.username, course.name]);
  }

}
