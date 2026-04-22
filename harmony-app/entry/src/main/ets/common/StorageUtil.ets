import { preferences } from '@kit.ArkData'
import { common } from '@kit.AbilityKit'

let dataPreferencesInstance: preferences.Preferences | null = null

/**
 * 初始化首选项存储
 */
export async function initStorage(context: common.UIAbilityContext): Promise<void> {
  dataPreferencesInstance = await preferences.getPreferences(context, 'app_prefs')
}

/**
 * 获取Preferences实例
 */
function getPrefs(): preferences.Preferences {
  if (!dataPreferencesInstance) {
    throw new Error('StorageUtil not initialized. Call initStorage first.')
  }
  return dataPreferencesInstance
}

/**
 * 保存字符串
 */
export async function putString(key: string, value: string): Promise<void> {
  const prefs = getPrefs()
  await prefs.put(key, value)
  await prefs.flush()
}

/**
 * 获取字符串
 */
export async function getString(key: string, defValue: string = ''): Promise<string> {
  const prefs = getPrefs()
  const val: string | number = await prefs.get(key, defValue) as string | number
  return val as string
}

/**
 * 保存数字
 */
export async function putNumber(key: string, value: number): Promise<void> {
  const prefs = getPrefs()
  await prefs.put(key, value)
  await prefs.flush()
}

/**
 * 获取数字
 */
export async function getNumber(key: string, defValue: number = 0): Promise<number> {
  const prefs = getPrefs()
  const val: string | number = await prefs.get(key, defValue) as string | number
  return val as number
}

/**
 * 保存布尔值
 */
export async function putBoolean(key: string, value: boolean): Promise<void> {
  const prefs = getPrefs()
  await prefs.put(key, value)
  await prefs.flush()
}

/**
 * 获取布尔值
 */
export async function getBoolean(key: string, defValue: boolean = false): Promise<boolean> {
  const prefs = getPrefs()
  const val: string | boolean = await prefs.get(key, defValue) as string | boolean
  return val as boolean
}

/**
 * 删除键
 */
export async function remove(key: string): Promise<void> {
  const prefs = getPrefs()
  await prefs.delete(key)
  await prefs.flush()
}

/**
 * 清除所有
 */
export async function clear(): Promise<void> {
  const prefs = getPrefs()
  await prefs.clear()
  await prefs.flush()
}
