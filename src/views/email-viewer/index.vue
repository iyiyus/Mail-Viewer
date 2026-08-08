<template>
  <div class="email-viewer">
    <!-- 页面头部 -->
    <header class="ev-header">
      <h1 class="ev-title">邮件查看器</h1>
      <div class="ev-header-actions">
        <el-button type="primary" :icon="Plus" @click="openAddDialog">添加账号</el-button>
        <el-button
          type="success"
          :icon="RefreshRight"
          :loading="fetchingAll"
          @click="fetchAllEmails"
        >
          获取全部邮件
        </el-button>
      </div>
    </header>

    <!-- 内容区 -->
    <template v-if="activeAccount">
      <!-- 工具栏 -->
      <div class="ev-toolbar">
        <div class="ev-toolbar-left">
          <el-select
            v-model="activeId"
            class="ev-acc-select"
            placeholder="选择账号"
            @change="onAccountSwitch"
          >
            <el-option v-for="acc in accounts" :key="acc.id" :label="acc.email" :value="acc.id">
              <div class="ev-option-inner">
                <span class="ev-option-avatar" :style="{ backgroundColor: avatarColor(acc) }">
                  {{ acc.email.charAt(0).toUpperCase() }}
                </span>
                <span class="ev-option-email">{{ acc.email }}</span>
                <span
                  class="ev-option-count"
                  :class="acc.fetching ? 'is-loading' : acc.emails.length ? 'is-data' : ''"
                >
                  {{ acc.fetching ? '获取中...' : acc.emails.length }}
                </span>
              </div>
            </el-option>
          </el-select>
          <el-button
            :icon="Refresh"
            size="small"
            :loading="activeAccount.fetching"
            @click="fetchSingle(activeAccount)"
          />
          <el-button :icon="Close" size="small" @click="removeAcc(activeId)" />
          <el-input
            v-model="searchKeyword"
            placeholder="搜索主题、发件人..."
            clearable
            :prefix-icon="Search"
            class="ev-search"
          />
        </div>
        <div class="ev-toolbar-right">
          <el-pagination
            v-model:current-page="currentPage"
            :page-size="pageSize"
            :total="filteredEmails.length"
            layout="total, prev, pager, next"
            size="small"
            background
          />
        </div>
      </div>

      <!-- 邮件列表 + 预览面板 -->
      <div class="ev-main-panel">
        <!-- 左侧：邮件列表（移动端选中详情后隐藏） -->
        <div v-show="!isMobile || !selectedEmail" class="ev-list-panel">
          <div v-if="pagedEmails.length" class="ev-email-list">
            <div
              v-for="email in pagedEmails"
              :key="email.id"
              class="ev-email-item"
              :class="{ 'is-unread': !email.isRead, 'is-selected': selectedEmail?.id === email.id }"
              @click="openDetail(email)"
            >
              <div class="ev-email-subject">{{ email.subject || '(无主题)' }}</div>
              <div class="ev-email-meta">
                <span class="ev-email-from">{{
                  email.from?.emailAddress?.name || email.from?.emailAddress?.address
                }}</span>
                <span class="ev-email-time">{{ formatTime(email.receivedDateTime) }}</span>
              </div>
              <div class="ev-email-preview">{{ email.bodyPreview }}</div>
            </div>
          </div>
          <div v-else-if="!activeAccount.fetching" class="ev-empty-inline">
            暂无邮件，点击上方"获取全部邮件"开始获取
          </div>
        </div>

        <!-- 左侧底部（移动端分页） -->
        <div v-if="isMobile && !selectedEmail" class="ev-mobile-pager">
          <el-pagination
            v-model:current-page="currentPage"
            :page-size="pageSize"
            :total="filteredEmails.length"
            layout="prev, next"
            size="small"
            background
          />
        </div>

        <!-- 右侧：邮件预览（移动端全屏） -->
        <div v-show="!isMobile || !!selectedEmail" class="ev-preview-panel">
          <template v-if="selectedEmail">
            <div class="ev-detail-header">
              <el-button v-if="isMobile" :icon="ArrowLeft" size="small" @click="closeDetail">
                返回
              </el-button>
              <h2 class="ev-detail-title">{{ selectedEmail.subject || '(无主题)' }}</h2>
              <div class="ev-detail-actions">
                <el-button
                  :icon="selectedEmail.webLink ? Link : undefined"
                  size="small"
                  circle
                  title="在浏览器中打开"
                  @click="openInBrowser(selectedEmail.webLink)"
                />
                <el-button :icon="Close" circle size="small" @click="closeDetail" />
              </div>
            </div>
            <div class="ev-detail-meta">
              <div class="ev-detail-row">
                <span class="ev-label">发件人：</span>
                <span class="ev-detail-val"
                  >{{ selectedEmail.from?.emailAddress?.name }} &lt;{{
                    selectedEmail.from?.emailAddress?.address
                  }}&gt;</span
                >
              </div>
              <div class="ev-detail-row">
                <span class="ev-label">收件人：</span>
                <span class="ev-detail-val">{{
                  formatRecipients(selectedEmail.toRecipients)
                }}</span>
              </div>
              <div class="ev-detail-row">
                <span class="ev-label">时&emsp;间：</span>
                <span class="ev-detail-val">{{ formatTime(selectedEmail.receivedDateTime) }}</span>
                <el-tag
                  v-if="selectedEmail.hasAttachments"
                  size="small"
                  type="warning"
                  class="ev-attach-tag"
                  >含附件</el-tag
                >
              </div>
            </div>
            <div class="ev-detail-body" v-html="selectedEmailBody" />
          </template>
        </div>

        <!-- 桌面端未选中时占位 -->
        <div v-if="!isMobile && !selectedEmail" class="ev-preview-placeholder">
          <div class="ev-placeholder-inner">
            <el-icon :size="48" color="var(--el-border-color)"><Message /></el-icon>
            <p>选择左侧邮件以预览内容</p>
          </div>
        </div>
      </div>
    </template>

    <!-- 空状态 -->
    <section v-else class="ev-empty-full">
      <el-empty description="添加邮箱账号开始查看邮件">
        <el-button type="primary" @click="openAddDialog">添加账号</el-button>
      </el-empty>
    </section>

    <!-- 添加账号弹窗 -->
    <el-dialog v-model="showDialog" title="添加邮箱账号" width="720px" top="8vh" destroy-on-close>
      <div class="ev-dialog-tip">
        每行一个账号，使用 <code>|</code> 或 <code>----</code> 分隔各字段，格式：<br />
        <code>邮箱 | 密码 | clientId | refreshToken</code> 或
        <code>邮箱----密码----clientId----refreshToken</code>
      </div>
      <el-input
        v-model="batchInput"
        type="textarea"
        :rows="10"
        placeholder="WendieBernadette61@outlook.com----qimEZp8HczNI----9e5f94bc-..."
        class="ev-batch-textarea"
      />
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmAdd">确认添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
  import {
    ArrowLeft,
    Close,
    Link,
    Message,
    Plus,
    Refresh,
    RefreshRight,
    Search
  } from '@element-plus/icons-vue'
  import axios from 'axios'
  import { ElMessage } from 'element-plus'

  // ==================== 类型 ====================
  interface EmailAccount {
    id: string
    email: string
    password: string
    clientId: string
    refreshToken: string
    accessToken?: string
    emails: EmailItem[]
    fetching: boolean
  }

  interface EmailItem {
    id: string
    subject: string
    from: { emailAddress: { name: string; address: string } }
    toRecipients: { emailAddress: { name: string; address: string } }[]
    receivedDateTime: string
    bodyPreview: string
    body: { contentType: string; content: string }
    hasAttachments: boolean
    importance: string
    isRead: boolean
    webLink: string
  }

  // ==================== 持久化 ====================
  const STORE_KEY = 'emv_app_accounts'

  function loadAccounts(): EmailAccount[] {
    try {
      const raw = localStorage.getItem(STORE_KEY)
      if (raw) {
        return JSON.parse(raw).map((a: any) => ({
          ...a,
          emails: [],
          fetching: false
        }))
      }
    } catch {
      /* ignore */
    }
    return []
  }

  function saveAccounts() {
    const toSave = accounts.value.map((a) => ({
      id: a.id,
      email: a.email,
      password: a.password,
      clientId: a.clientId,
      refreshToken: a.refreshToken
    }))
    localStorage.setItem(STORE_KEY, JSON.stringify(toSave))
  }

  // ==================== 状态 ====================
  const accounts = ref<EmailAccount[]>(loadAccounts())
  const activeId = ref(accounts.value[0]?.id ?? '')
  const selectedEmail = ref<EmailItem | null>(null)
  const showDialog = ref(false)
  const batchInput = ref('')
  const searchKeyword = ref('')
  const currentPage = ref(1)
  const pageSize = ref(15)
  const fetchingAll = ref(false)

  // ==================== 移动端检测 ====================
  const windowWidth = ref(window.innerWidth)
  const isMobile = computed(() => windowWidth.value < 768)

  function onResize() {
    windowWidth.value = window.innerWidth
  }

  onMounted(() => window.addEventListener('resize', onResize))
  onUnmounted(() => window.removeEventListener('resize', onResize))

  function openDetail(email: EmailItem) {
    selectedEmail.value = email
  }

  function closeDetail() {
    selectedEmail.value = null
  }

  // ==================== 计算属性 ====================
  const activeAccount = computed(() => accounts.value.find((a) => a.id === activeId.value) ?? null)

  const filteredEmails = computed(() => {
    const acc = activeAccount.value
    if (!acc) return []
    const kw = searchKeyword.value.toLowerCase()
    if (!kw) return acc.emails
    return acc.emails.filter(
      (e) =>
        e.subject?.toLowerCase().includes(kw) ||
        e.from?.emailAddress?.name?.toLowerCase().includes(kw) ||
        e.from?.emailAddress?.address?.toLowerCase().includes(kw) ||
        e.bodyPreview?.toLowerCase().includes(kw)
    )
  })

  const pagedEmails = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    return filteredEmails.value.slice(start, start + pageSize.value)
  })

  const selectedEmailBody = computed(() => {
    if (!selectedEmail.value?.body) return ''
    const b = selectedEmail.value.body
    return b.contentType === 'html'
      ? b.content
      : `<pre style="white-space:pre-wrap;font-family:inherit;margin:0">${escapeHtml(b.content)}</pre>`
  })

  // ==================== 搜索变化时重置页码 ====================
  watch(searchKeyword, () => (currentPage.value = 1))

  // ==================== API ====================
  async function getAccessToken(account: EmailAccount): Promise<string> {
    const params = new URLSearchParams()
    params.append('client_id', account.clientId)
    params.append('refresh_token', account.refreshToken)
    params.append('grant_type', 'refresh_token')
    params.append('scope', 'https://graph.microsoft.com/.default offline_access')

    try {
      const res = await axios.post('http://localhost:5199/', params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })

      console.log('[token response]', res.status, JSON.stringify(res.data).substring(0, 300))
      const { access_token, refresh_token } = res.data
      if (refresh_token) {
        account.refreshToken = refresh_token
        saveAccounts()
      }
      if (!access_token) {
        throw new Error('Token 响应中没有 access_token')
      }
      return access_token
    } catch (err: any) {
      const detail = err.response?.data
      console.error('[token error]', JSON.stringify(detail))
      const msg = detail?.error_description || detail?.error || err.message
      throw new Error(`Token 获取失败: ${msg}`)
    }
  }

  async function fetchEmailsForAccount(account: EmailAccount) {
    account.fetching = true
    account.emails = []

    try {
      const token = await getAccessToken(account)
      account.accessToken = token

      let nextUrl: string | null = '/v1.0/me/mailFolders/inbox/messages'
      const allEmails: EmailItem[] = []
      let page = 0
      const selectFields =
        'id,subject,from,toRecipients,receivedDateTime,bodyPreview,body,hasAttachments,importance,isRead,webLink'

      while (nextUrl) {
        page++
        const fetchPath: string = nextUrl.includes('?')
          ? nextUrl
          : `${nextUrl}?$top=100&$orderby=receivedDateTime desc&$select=${selectFields}`

        const res: any = await axios.get(`http://localhost:5199${fetchPath}`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        const messages: EmailItem[] = res.data.value ?? []
        allEmails.push(...messages)

        // 提取 nextLink 的路径部分
        const rawNext: string | undefined = res.data['@odata.nextLink']
        nextUrl = rawNext ? rawNext.replace('https://graph.microsoft.com', '') : null

        ElMessage.info(`${account.email} 第 ${page} 页获取完成 (${messages.length} 封)`)
      }

      account.emails = allEmails
      ElMessage.success(`${account.email} 全部邮件获取完成，共 ${allEmails.length} 封`)
    } catch (err: any) {
      ElMessage.error(
        `${account.email} 获取失败：${err.response?.data?.error?.message || err.message}`
      )
      console.error(err)
    } finally {
      account.fetching = false
    }
  }

  async function fetchSingle(account: EmailAccount) {
    await fetchEmailsForAccount(account)
  }

  async function fetchAllEmails() {
    fetchingAll.value = true
    for (const acc of accounts.value) {
      await fetchEmailsForAccount(acc)
    }
    fetchingAll.value = false
    ElMessage.success('全部账号邮件获取完成！')
  }

  // ==================== 账号操作 ====================
  function selectAcc(id: string) {
    activeId.value = id
    selectedEmail.value = null
    searchKeyword.value = ''
    currentPage.value = 1
  }

  function onAccountSwitch(id: string) {
    selectAcc(id)
  }

  function removeAcc(id: string) {
    accounts.value = accounts.value.filter((a) => a.id !== id)
    if (activeId.value === id) {
      activeId.value = accounts.value[0]?.id ?? ''
      selectedEmail.value = null
    }
    saveAccounts()
  }

  // 解析输入，支持 | 和 ---- 两种分隔符
  function parseAccountLine(line: string): string[] | null {
    const trimmed = line.trim()
    if (!trimmed) return null

    // 优先尝试 ---- 分隔
    const parts4 = trimmed.split('----')
    if (parts4.length >= 4) {
      return parts4.slice(0, 4).map((s) => s.trim())
    }

    // 再尝试 | 分隔
    const parts1 = trimmed.split('|')
    if (parts1.length >= 4) {
      return parts1.slice(0, 4).map((s) => s.trim())
    }

    return null
  }

  function confirmAdd() {
    const lines = batchInput.value
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)

    let added = 0
    for (const line of lines) {
      const parts = parseAccountLine(line)
      if (!parts) {
        ElMessage.warning(`格式不正确，已跳过：${line.substring(0, 40)}...`)
        continue
      }
      accounts.value.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        email: parts[0],
        password: parts[1],
        clientId: parts[2],
        refreshToken: parts[3],
        emails: [],
        fetching: false
      })
      added++
    }

    if (added > 0) {
      ElMessage.success(`成功添加 ${added} 个账号`)
      if (!activeId.value) activeId.value = accounts.value[0].id
      saveAccounts()
    }

    batchInput.value = ''
    showDialog.value = false
  }

  function openAddDialog() {
    showDialog.value = true
  }

  // 根据邮箱生成头像颜色
  const avatarPalette = [
    '#409eff',
    '#67c23a',
    '#e6a23c',
    '#f56c6c',
    '#8b5cf6',
    '#06b6d4',
    '#f97316',
    '#ec4899',
    '#14b8a6',
    '#6366f1'
  ]
  function avatarColor(acc: EmailAccount): string {
    let hash = 0
    for (let i = 0; i < acc.email.length; i++) {
      hash = acc.email.charCodeAt(i) + ((hash << 5) - hash)
    }
    return avatarPalette[Math.abs(hash) % avatarPalette.length]
  }

  // ==================== 工具方法 ====================
  function formatTime(dt: string): string {
    if (!dt) return ''
    return new Date(dt).toLocaleString('zh-CN', { hour12: false })
  }

  function formatRecipients(recipients: EmailItem['toRecipients']): string {
    if (!recipients?.length) return ''
    return recipients.map((r) => `${r.emailAddress.name} <${r.emailAddress.address}>`).join('; ')
  }

  function openInBrowser(url: string) {
    if (url) window.open(url, '_blank')
  }

  function escapeHtml(str: string): string {
    if (!str) return ''
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }
</script>

<style lang="scss" scoped>
  // ======================== 全局容器 ========================
  .email-viewer {
    min-height: 100vh;
    background: linear-gradient(180deg, #f0f3f8 0%, #eef1f6 100%);
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  // ======================== 头部 ========================
  .ev-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--default-box-color);
    padding: 14px 22px;
    border-radius: var(--art-radius-lg);
    box-shadow: var(--art-shadow-sm);
    border: 1px solid var(--art-c-border-2);
  }

  .ev-title {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: var(--art-gray-900);
    letter-spacing: -0.3px;
    display: flex;
    align-items: center;
    gap: 8px;

    &::before {
      content: '';
      display: inline-block;
      width: 6px;
      height: 22px;
      background: var(--theme-color);
      border-radius: 3px;
    }
  }

  .ev-header-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  // ======================== 工具栏 ========================
  .ev-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--default-box-color);
    padding: 10px 16px;
    border-radius: var(--art-radius-md);
    box-shadow: var(--art-shadow-sm);
    border: 1px solid var(--art-c-border-2);
    gap: 12px;
  }

  .ev-toolbar-left {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    min-width: 0;
  }

  .ev-acc-select {
    width: 220px;
    flex-shrink: 0;
  }

  .ev-search {
    width: 240px;
    max-width: 100%;
  }

  // ---------- 下拉选项 ----------
  .ev-option-inner {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
  }

  .ev-option-avatar {
    width: 26px;
    height: 26px;
    border-radius: var(--el-border-radius-base);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    color: #fff;
    flex-shrink: 0;
    user-select: none;
  }

  .ev-option-email {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--art-gray-800);
  }

  .ev-option-count {
    font-size: 11px;
    color: var(--art-gray-400);
    flex-shrink: 0;
    font-weight: 500;

    &.is-data {
      color: #13deb9;
      font-weight: 600;
    }

    &.is-loading {
      color: #ffae1f;
    }
  }

  // ======================== 主面板 ========================
  .ev-main-panel {
    display: flex;
    flex: 1;
    min-height: 0;
    background: var(--default-box-color);
    border-radius: var(--art-radius-lg);
    box-shadow: var(--art-shadow-md);
    overflow: hidden;
    border: 1px solid var(--art-c-border-2);
  }

  // ======================== 左侧邮件列表 ========================
  .ev-list-panel {
    width: 42%;
    min-width: 340px;
    border-right: 1px solid var(--art-gray-200);
    display: flex;
    flex-direction: column;
    background: var(--art-gray-50);
  }

  .ev-email-list {
    flex: 1;
    overflow-y: auto;
    min-height: 400px;
    max-height: calc(100vh - 280px);
    padding: 6px;

    &::-webkit-scrollbar {
      width: 4px;
    }
    &::-webkit-scrollbar-thumb {
      background: var(--art-gray-300);
      border-radius: 2px;
    }
  }

  .ev-email-item {
    padding: 14px 16px;
    margin-bottom: 4px;
    border-radius: var(--art-radius-md);
    cursor: pointer;
    transition: all 0.2s var(--art-ease-in-out);
    background: var(--default-box-color);
    position: relative;
    overflow: hidden;

    &:hover {
      background: #f8f9fc;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
      transform: translateX(2px);
    }

    &.is-selected {
      background: linear-gradient(135deg, #eef5ff 0%, #e8f2ff 100%);
      box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);

      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 8px;
        bottom: 8px;
        width: 3px;
        background: var(--theme-color);
        border-radius: 0 2px 2px 0;
      }
    }

    &.is-unread {
      .ev-email-subject {
        font-weight: 700;
        color: var(--art-gray-900);

        &::after {
          content: '';
          display: inline-block;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #13deb9;
          margin-left: 8px;
          vertical-align: middle;
          box-shadow: 0 0 0 2px rgba(19, 222, 185, 0.2);
        }
      }
    }
  }

  .ev-email-subject {
    font-size: 13.5px;
    color: var(--art-gray-800);
    margin-bottom: 6px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.4;
  }

  .ev-email-meta {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--art-gray-500);
    margin-bottom: 5px;
  }

  .ev-email-from {
    color: var(--art-gray-700);
    max-width: 55%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 500;
  }

  .ev-email-time {
    flex-shrink: 0;
    margin-left: 8px;
    font-size: 11px;
    color: var(--art-gray-400);
  }

  .ev-email-preview {
    font-size: 12px;
    color: var(--art-gray-400);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.5;
  }

  // ======================== 右侧预览面板 ========================
  .ev-preview-panel {
    flex: 1;
    overflow-y: auto;
    padding: 24px 28px;
    max-height: calc(100vh - 280px);
    min-width: 0;

    &::-webkit-scrollbar {
      width: 5px;
    }
    &::-webkit-scrollbar-thumb {
      background: var(--art-gray-300);
      border-radius: 3px;
    }
  }

  .ev-preview-placeholder {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    background: linear-gradient(180deg, var(--art-gray-50) 0%, #fff 100%);
  }

  .ev-placeholder-inner {
    text-align: center;
    color: var(--art-gray-400);
    font-size: 14px;

    .el-icon {
      margin-bottom: 8px;
      opacity: 0.5;
    }

    p {
      margin-top: 12px;
      font-size: 13px;
      color: var(--art-gray-300);
    }
  }

  // ---------- 邮件详情 ----------
  .ev-detail-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--art-gray-200);
    gap: 12px;
  }

  .ev-detail-title {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: var(--art-gray-900);
    word-break: break-word;
    line-height: 1.35;
    flex: 1;
    letter-spacing: -0.2px;
  }

  .ev-detail-actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }

  .ev-detail-meta {
    background: var(--art-gray-50);
    border-radius: var(--art-radius-md);
    padding: 14px 18px;
    margin-bottom: 20px;
    font-size: 13px;
    border: 1px solid var(--art-gray-200);

    .ev-label {
      color: var(--art-gray-500);
      margin-right: 8px;
      flex-shrink: 0;
      font-weight: 500;
    }
  }

  .ev-detail-row {
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    &:last-child {
      margin-bottom: 0;
    }
  }

  .ev-detail-val {
    flex: 1;
    word-break: break-all;
    min-width: 0;
    color: var(--art-gray-800);
  }

  .ev-attach-tag {
    margin-left: 10px;
  }

  .ev-detail-body {
    font-size: 14px;
    line-height: 1.85;
    color: var(--art-gray-800);
    word-break: break-word;

    :deep(img) {
      max-width: 100%;
      border-radius: var(--art-radius-sm);
    }

    :deep(a) {
      color: var(--theme-color);
      text-decoration: none;
      &:hover {
        text-decoration: underline;
      }
    }

    :deep(table) {
      max-width: 100%;
      border-collapse: collapse;
      border-radius: var(--art-radius-sm);
      overflow: hidden;
    }

    :deep(td),
    :deep(th) {
      border: 1px solid var(--art-gray-200);
      padding: 6px 12px;
    }

    :deep(th) {
      background: var(--art-gray-50);
      font-weight: 600;
    }

    :deep(blockquote) {
      margin: 12px 0;
      padding: 8px 16px;
      border-left: 3px solid var(--theme-color);
      color: var(--art-gray-600);
      background: var(--art-gray-50);
      border-radius: 0 var(--art-radius-sm) var(--art-radius-sm) 0;
    }
  }

  // ======================== 空状态 & 加载 ========================
  .ev-empty-inline {
    text-align: center;
    padding: 60px 20px;
    color: var(--art-gray-400);
    font-size: 13px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;

    &::before {
      content: '';
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--art-gray-100);
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none' stroke='%23a1a5aa' stroke-width='1.5'%3E%3Cpath d='M3 7h18M3 12h12M3 17h8'/%3E%3C/svg%3E");
      background-position: center;
      background-repeat: no-repeat;
    }
  }

  .ev-mobile-pager {
    display: none;
  }

  // ======================== 弹窗 ========================
  .ev-dialog-tip {
    margin-bottom: 14px;
    font-size: 13px;
    color: var(--art-gray-600);
    line-height: 1.8;

    code {
      display: inline-block;
      background: #fff8e6;
      color: #ffae1f;
      padding: 2px 8px;
      border-radius: var(--el-border-radius-base);
      font-size: 12px;
      font-family: Consolas, Monaco, monospace;
    }
  }

  .ev-batch-textarea {
    :deep(.el-textarea__inner) {
      font-family: Consolas, Monaco, monospace;
      font-size: 12px;
      line-height: 1.7;
      border-radius: var(--art-radius-md);
    }
  }

  // ======================== 分页 ========================
  .ev-pagination {
    padding: 14px 16px;
    border-top: 1px solid var(--art-gray-200);
    background: #fff;
    border-radius: 0 0 var(--art-radius-lg) 0;
  }

  // ======================== 移动端适配 ========================
  @media (max-width: 767px) {
    .email-viewer {
      padding: 8px;
      gap: 8px;
      min-height: 100dvh;
    }

    .ev-header {
      flex-direction: column;
      gap: 10px;
      padding: 12px 14px;
      border-radius: var(--art-radius-md);
    }

    .ev-title {
      font-size: 17px;
      &::before {
        width: 4px;
        height: 18px;
      }
    }

    .ev-header-actions {
      width: 100%;
      justify-content: flex-end;
    }

    .ev-toolbar {
      flex-direction: column;
      padding: 10px 12px;
      gap: 8px;
      border-radius: var(--art-radius-md);
    }

    .ev-toolbar-left {
      width: 100%;
      flex-wrap: wrap;
      gap: 8px;
    }

    .ev-acc-select {
      width: 100%;
    }

    .ev-search {
      width: 100%;
    }

    .ev-main-panel {
      flex-direction: column;
      border-radius: var(--art-radius-md);
    }

    .ev-list-panel {
      width: 100% !important;
      min-width: 0;
      border-right: none;
      border-bottom: 1px solid var(--art-gray-200);
      border-radius: var(--art-radius-md) var(--art-radius-md) 0 0;
    }

    .ev-email-list {
      max-height: calc(100dvh - 280px);
      min-height: 0;
      padding: 4px;
    }

    .ev-email-item {
      padding: 12px 14px;
      border-radius: var(--art-radius-sm);

      &.is-selected::before {
        top: 6px;
        bottom: 6px;
      }
    }

    .ev-preview-panel {
      max-height: calc(100dvh - 140px);
      padding: 14px 16px;
      flex: none;
    }

    .ev-detail-title {
      font-size: 16px;
    }

    .ev-detail-meta {
      font-size: 12px;
      padding: 10px 12px;
    }

    .ev-detail-body {
      font-size: 13px;
    }

    .ev-preview-placeholder {
      display: none;
    }

    .ev-pagination {
      padding: 10px;
    }

    .ev-mobile-pager {
      display: flex;
      justify-content: center;
      padding: 10px 0;
      border-top: 1px solid var(--art-gray-200);
      background: #fff;
    }
  }

  // ======================== 无账号欢迎页 ========================
  .ev-empty-full {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 120px 20px;
    flex-direction: column;
    gap: 16px;
    color: var(--art-gray-400);
    font-size: 14px;

    &::before {
      content: '';
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: var(--art-gray-100);
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' fill='none' stroke='%23a1a5aa' stroke-width='1.5'%3E%3Crect x='2' y='4' width='24' height='18' rx='2'/%3E%3Cpath d='m2 7 11 8a1 1 0 0 0 1.2 0L26 7'/%3E%3C/svg%3E");
      background-position: center;
      background-repeat: no-repeat;
    }
  }
</style>
