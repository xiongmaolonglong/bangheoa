/**
 * 表单验证规则
 */

import { isEmpty } from './index'

/**
 * 必填验证
 */
export function required(message = '此项为必填项') {
  return {
    required: true,
    message,
    trigger: 'blur'
  }
}

/**
 * 手机号验证
 */
export function phone(message = '请输入正确的手机号') {
  return {
    pattern: /^1[3-9]\d{9}$/,
    message,
    trigger: 'blur'
  }
}

/**
 * 邮箱验证
 */
export function email(message = '请输入正确的邮箱地址') {
  return {
    pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    message,
    trigger: 'blur'
  }
}

/**
 * 密码强度验证
 */
export function password(minLength = 6, message) {
  return {
    min: minLength,
    message: message || `密码长度不能少于${minLength}位`,
    trigger: 'blur'
  }
}

/**
 * 数字范围验证
 */
export function numberRange(min, max, message) {
  return {
    validator: (rule, value, callback) => {
      if (isEmpty(value)) {
        callback()
        return
      }
      const num = Number(value)
      if (isNaN(num) || num < min || num > max) {
        callback(new Error(message || `数值必须在${min}到${max}之间`))
      } else {
        callback()
      }
    },
    trigger: 'blur'
  }
}

/**
 * 长度验证
 */
export function length(min, max, message) {
  return {
    min,
    max,
    message: message || `长度在${min}到${max}个字符之间`,
    trigger: 'blur'
  }
}

/**
 * URL 验证
 */
export function url(message = '请输入正确的URL地址') {
  return {
    pattern: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
    message,
    trigger: 'blur'
  }
}
