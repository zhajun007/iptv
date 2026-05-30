import { readFileSync, existsSync } from "node:fs"
import path from "node:path"

const SYSTEM_CONFIG_PATH = path.join(process.cwd(), 'system-config.json')

// 加载系统配置文件
function loadSystemConfig() {
  if (existsSync(SYSTEM_CONFIG_PATH)) {
    try {
      const content = readFileSync(SYSTEM_CONFIG_PATH, 'utf-8')
      return JSON.parse(content)
    } catch (error) {
      console.error('加载系统配置失败:', error.message)
      return {}
    }
  }
  return {}
}

// 解析布尔值：支持 system-config.json 的真布尔值，以及环境变量字符串 "false"/"0"/"off"/"no"
// （修复历史问题：旧写法 `env || true` 导致环境变量永远无法关闭开关）
function parseBool(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback
  if (typeof value === 'boolean') return value
  const str = String(value).trim().toLowerCase()
  return str !== 'false' && str !== '0' && str !== 'off' && str !== 'no'
}

// 清洗 URL 路径段（用于自定义管理页路径）：去首尾斜杠，禁止内部斜杠/空白，
// 避开与内置路由冲突的保留字，非法时回退默认值
const RESERVED_SEGMENTS = ['api', 'player', 'favicon.ico']
function sanitizeSegment(value, fallback) {
  if (!value) return fallback
  const s = String(value).trim().replace(/^\/+|\/+$/g, '')
  if (!s || /[\/\s]/.test(s) || RESERVED_SEGMENTS.includes(s.toLowerCase())) return fallback
  return s
}

// 导出值使用 let，配合 reloadConfig() 实现热更新：
// ESM 命名导出是实时绑定，重新赋值后所有 import 方都会读到新值。
// 注意：port、programInfoUpdateInterval 在 server.listen / setInterval 时已被读取，
// 热更新不会改变已启动的监听端口与定时器周期，这两项仍需重启生效。
let userId, token, port, host, rateType, debug, pass, enableHDR, enableH265, programInfoUpdateInterval, refreshToken, adminPath

function applyConfig(systemConfig) {
  // 用户id
  userId = systemConfig.userId || process.env.muserId || ""
  // 用户token 可以使用网页登录获取
  token = systemConfig.token || process.env.mtoken || ""
  // 本地运行端口号
  port = systemConfig.port || process.env.mport || 1905
  // 公网/自定义访问地址
  host = systemConfig.host || process.env.mhost || ""
  // 画质
  // 4蓝光(1080p，需要登录且账号有VIP)
  // 3高清(720p)
  // 2标清(480p)
  rateType = systemConfig.rateType || process.env.mrateType || 3
  debug = process.env.mdebug || false
  // 访问密码 大小写字母和数字 添加后访问格式 http://ip:port/mpass/...
  pass = systemConfig.pass || process.env.mpass || ""
  // 是否开启hdr
  enableHDR = systemConfig.enableHDR !== undefined ? systemConfig.enableHDR : parseBool(process.env.menableHDR, true)
  // 是否开启h265(原画画质)，开启可能存在兼容性问题，比如浏览器播放没有画面
  enableH265 = systemConfig.enableH265 !== undefined ? systemConfig.enableH265 : parseBool(process.env.menableH265, true)
  // 节目信息更新间隔 单位小时 不建议设置太短
  programInfoUpdateInterval = systemConfig.programInfoUpdateInterval || process.env.mupdateInterval || "8"
  // 是否每月刷新token（可能是导致封号的原因，可关闭）
  refreshToken = systemConfig.refreshToken !== undefined ? systemConfig.refreshToken : parseBool(process.env.mrefreshToken, true)
  // 管理页面自定义路径（默认 admin）：改名后用 /<adminPath> 访问后台，裸 /admin 失效
  adminPath = sanitizeSegment(systemConfig.adminPath || process.env.madminPath, 'admin')
}

applyConfig(loadSystemConfig())

// 重新加载系统配置（保存系统配置后调用，避免必须重启进程）
function reloadConfig() {
  applyConfig(loadSystemConfig())
  return { userId, token, port, host, rateType, pass, enableHDR, enableH265, programInfoUpdateInterval, refreshToken, adminPath }
}

export { userId, token, port, host, rateType, debug, pass, enableHDR, programInfoUpdateInterval, enableH265, refreshToken, adminPath, reloadConfig, sanitizeSegment }
