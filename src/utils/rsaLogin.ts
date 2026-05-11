import JSEncrypt from 'jsencrypt'

/**
 * 使用认证服务下发的 SPKI PEM 公钥对明文口令做 RSA PKCS#1 v1.5 加密，输出 Base64 密文（与后端 RSAUtil 一致）。
 */
export function encryptLoginPassword(publicKeyPem: string, plainPassword: string): string {
  const enc = new JSEncrypt()
  enc.setPublicKey(publicKeyPem)
  const cipher = enc.encrypt(plainPassword)
  if (!cipher) {
    throw new Error('口令加密失败，请刷新页面后重试')
  }
  return cipher
}
