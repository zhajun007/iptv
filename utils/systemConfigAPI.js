import { readFileSync, existsSync } from "node:fs"
import path from "node:path"
import { writeJsonFileSync } from "./fileUtil.js"
import { reloadConfig } from "../config.js"

const SYSTEM_CONFIG_PATH = path.join(process.cwd(), 'system-config.json')

/**
 * 获取系统配置
 */
export function getSystemConfigAPI() {
  try {
    if (!existsSync(SYSTEM_CONFIG_PATH)) {
      // 返回默认配置
      return {
        success: true,
        data: {
          userId: "",
          token: "",
          port: 1905,
          host: "",
          rateType: 3,
          pass: "",
          enableHDR: true,
          enableH265: true,
          programInfoUpdateInterval: "8",
          refreshToken: true
        }
      }
    }
    
    const config = JSON.parse(readFileSync(SYSTEM_CONFIG_PATH, 'utf-8'))
    return {
      success: true,
      data: config
    }
  } catch (error) {
    return {
      success: false,
      message: error.message
    }
  }
}

/**
 * 保存系统配置
 */
export function saveSystemConfigAPI(config) {
  try {
    // 读取已有配置，保留表单未提交的字段（如 refreshToken 等无 UI 的开关），
    // 避免每次保存把它们重置为默认值
    let existing = {}
    if (existsSync(SYSTEM_CONFIG_PATH)) {
      try {
        existing = JSON.parse(readFileSync(SYSTEM_CONFIG_PATH, 'utf-8'))
      } catch { existing = {} }
    }

    // 验证配置（白名单字段做类型校验，其余沿用已有值）
    const validated = {
      ...existing,
      userId: config.userId || "",
      token: config.token || "",
      port: parseInt(config.port) || 1905,
      host: config.host || "",
      rateType: parseInt(config.rateType) || 3,
      pass: config.pass || "",
      enableHDR: config.enableHDR !== false,
      enableH265: config.enableH265 !== false,
      programInfoUpdateInterval: config.programInfoUpdateInterval || "8"
    }
    if (config.refreshToken !== undefined) {
      validated.refreshToken = config.refreshToken !== false
    }

    // 原子写入，避免并发保存 / 写入中断损坏文件
    writeJsonFileSync(SYSTEM_CONFIG_PATH, validated)
    // 热更新配置：除端口和更新间隔外即时生效，无需重启
    reloadConfig()
    return {
      success: true,
      message: '配置保存成功（端口与更新间隔需重启生效，其余已即时生效）'
    }
  } catch (error) {
    return {
      success: false,
      message: error.message
    }
  }
}
