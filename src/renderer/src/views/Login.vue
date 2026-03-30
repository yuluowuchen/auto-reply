<template>
  <div class="login-page">
    <!-- 背景装饰圆圈 -->
    <div class="bg-decoration">
      <div class="circle circle-1"></div>
      <div class="circle circle-2"></div>
      <div class="circle circle-3"></div>
    </div>

    <div :class="['main-container', { 'is-register': !isLogin }]">
      <!-- 注册表单容器 -->
      <div class="form-container register-container">
        <form @submit.prevent="handleRegister">
          <h2 class="form-title">创建账号</h2>
          <p class="form-subtitle">开启您的智能回复之旅</p>
          
          <div class="input-group">
            <el-icon class="input-icon"><User /></el-icon>
            <input 
              v-model="registerForm.username" 
              type="text" 
              placeholder="请输入用户名"
              required
            />
          </div>
          
          <div class="input-group">
            <el-icon class="input-icon"><Lock /></el-icon>
            <input 
              v-model="registerForm.password" 
              type="password" 
              placeholder="请输入密码"
              required
            />
          </div>
          
          <div class="input-group">
            <el-icon class="input-icon"><CircleCheck /></el-icon>
            <input 
              v-model="registerForm.confirmPassword" 
              type="password" 
              placeholder="请再次确认密码"
              required
            />
          </div>

          <button class="submit-btn" :disabled="loading" @click="handleRegister">
            <span v-if="!loading">立即注册</span>
            <el-icon v-else class="is-loading"><Loading /></el-icon>
          </button>
        </form>
      </div>

      <!-- 登录表单容器 -->
      <div class="form-container login-container">
        <form @submit.prevent="handleLogin">
          <h2 class="form-title">欢迎回来</h2>
          <p class="form-subtitle">登录以继续管理您的智能回复</p>
          
          <div class="input-group">
            <el-icon class="input-icon"><User /></el-icon>
            <input 
              v-model="loginForm.username" 
              type="text" 
              placeholder="用户名 / 邮箱 / 手机号"
              required
            />
          </div>
          
          <div class="input-group">
            <el-icon class="input-icon"><Lock /></el-icon>
            <input 
              v-model="loginForm.password" 
              type="password" 
              placeholder="请输入密码"
              required
            />
          </div>

          <div class="form-options">
            <label class="remember-me">
              <input type="checkbox" v-model="loginForm.rememberMe"> 记住我
            </label>
            <a href="#" class="forgot-pwd" @click.prevent="showRecharge = true">账户充值</a>
          </div>

          <button class="submit-btn" :disabled="loading" @click="handleLogin">
            <span v-if="!loading">立即登录</span>
            <el-icon v-else class="is-loading"><Loading /></el-icon>
          </button>
        </form>
      </div>

      <!-- 侧边切换面板 -->
      <div :class="['overlay-container', { 'is-register': !isLogin }]">
        <div class="overlay">
          <div class="overlay-panel overlay-left">
            <h2>已有账号？</h2>
            <p>赶快登录，开启您的智能回复高效工作流</p>
            <button class="ghost-btn" @click="toggleMode">立即登录</button>
          </div>
          <div class="overlay-panel overlay-right">
            <h2>新用户？</h2>
            <p>只需几秒钟注册，即可体验全自动化的社交回复体验</p>
            <button class="ghost-btn" @click="toggleMode">立即注册</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 充值弹窗 -->
    <RechargeDialog v-model="showRecharge" :username="loginForm.username" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock, CircleCheck, Loading } from '@element-plus/icons-vue'
import RechargeDialog from '../components/RechargeDialog.vue'

const router = useRouter()
const isLogin = ref(true)
const loading = ref(false)
const showRecharge = ref(false)

const loginForm = reactive({
  username: '',
  password: '',
  rememberMe: false
})

const registerForm = reactive({
  username: '',
  password: '',
  confirmPassword: ''
})

const toggleMode = () => {
  isLogin.value = !isLogin.value
}

// 页面加载时恢复保存的账号密码
onMounted(() => {
  const savedUser = localStorage.getItem('remembered_user')
  if (savedUser) {
    try {
      const { username, password } = JSON.parse(savedUser)
      loginForm.username = username
      loginForm.password = password
      loginForm.rememberMe = true
    } catch (e) {
      console.error('解析保存的用户信息失败:', e)
      localStorage.removeItem('remembered_user')
    }
  }
})

const handleLogin = async () => {
  if (loading.value) return
  if (!loginForm.username || !loginForm.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }

  loading.value = true
  try {
    const res = await window.api.verify.login({
      username: loginForm.username,
      password: loginForm.password
    })

    if (res.success) {
      // 保存登录凭证 (auth_token)
      if (res.token) {
        localStorage.setItem('auth_token', res.token)
      } else {
        // 如果后端没有返回 token，我们也临时设置一个标志表示已登录
        localStorage.setItem('auth_token', 'true')
      }

      // 如果勾选了记住我，则保存账号密码
      if (loginForm.rememberMe) {
        localStorage.setItem('remembered_user', JSON.stringify({
          username: loginForm.username,
          password: loginForm.password
        }))
      } else {
        localStorage.removeItem('remembered_user')
      }

      ElMessage.success({
        message: '登录成功，欢迎回来',
        plain: true
      })
      router.push('/home')
    } else {
      ElMessage.error({
        message: '登录失败: ' + res.error,
        plain: true
      })
    }
  } catch (error) {
    console.error('登录异常:', error)
    ElMessage.error('登录过程出现异常')
  } finally {
    loading.value = false
  }
}

const handleRegister = async () => {
  if (loading.value) return
  if (!registerForm.username || !registerForm.password) {
    ElMessage.warning('请填写完整的注册信息')
    return
  }
  if (registerForm.password !== registerForm.confirmPassword) {
    ElMessage.warning('两次输入的密码不一致')
    return
  }

  loading.value = true
  try {
    const res = await window.api.verify.register({
      username: registerForm.username,
      password: registerForm.password
    })

    if (res.success) {
      ElMessage.success({
        message: '注册成功，请使用新账号登录',
        plain: true
      })
      isLogin.value = true
      registerForm.username = ''
      registerForm.password = ''
      registerForm.confirmPassword = ''
    } else {
      ElMessage.error({
        message: '注册失败: ' + res.error,
        plain: true
      })
    }
  } catch (error) {
    console.error('注册异常:', error)
    ElMessage.error('注册过程出现异常')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

* {
  box-sizing: border-box;
}

.login-page {
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: 'Poppins', sans-serif;
  background: #f0f2f5;
  overflow: hidden;
  position: relative;
}

/* 背景装饰 */
.bg-decoration {
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 0;
}

.circle {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.6;
}

.circle-1 {
  width: 400px;
  height: 400px;
  background: #4b70e2;
  top: -100px;
  right: -100px;
}

.circle-2 {
  width: 350px;
  height: 350px;
  background: #9d50bb;
  bottom: -50px;
  left: -50px;
}

.circle-3 {
  width: 250px;
  height: 250px;
  background: #00f2fe;
  top: 40%;
  left: 20%;
}

/* 主容器 */
.main-container {
  position: relative;
  width: 850px;
  height: 550px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
  border-radius: 24px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
  display: flex;
  overflow: hidden;
  z-index: 1;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

/* 表单通用样式 */
.form-container {
  position: absolute;
  top: 0;
  height: 100%;
  width: 50%;
  transition: all 0.6s ease-in-out;
  display: flex;
  justify-content: center;
  align-items: center;
  background: transparent;
  opacity: 0;
  z-index: 1;
}

.login-container {
  left: 0;
  opacity: 1;
  z-index: 2;
}

.register-container {
  left: 0;
}

.main-container.is-register .login-container {
  transform: translateX(100%);
  opacity: 0;
  z-index: 1;
}

.main-container.is-register .register-container {
  transform: translateX(100%);
  opacity: 1;
  z-index: 2;
}

form {
  width: 100%;
  max-width: 340px; /* 略微增加宽度 */
  padding: 0 40px; /* 将内边距移到 form 上，确保内容居中 */
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.form-title {
  font-size: 28px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 8px;
}

.form-subtitle {
  font-size: 13px;
  color: #7f8c8d;
  margin-bottom: 35px;
}

/* 输入框组 */
.input-group {
  width: 100%;
  max-width: 280px; /* 统一限制输入框组的宽度，确保其在容器内视觉居中 */
  position: relative;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  background: #f8f9fa;
  border-radius: 12px;
  transition: all 0.3s;
  border: 1px solid transparent;
}

.input-group:focus-within {
  background: #fff;
  border-color: #4b70e2;
  box-shadow: 0 0 0 4px rgba(75, 112, 226, 0.1);
}

.input-icon {
  padding: 0 12px;
  font-size: 16px;
  color: #a0a5a8;
}

input {
  flex: 1;
  padding: 12px 12px 12px 0;
  border: none;
  background: transparent;
  outline: none;
  font-size: 13px;
  color: #2c3e50;
  min-width: 0;
}

input::placeholder {
  color: #b0b5b8;
}

/* 表单选项 */
.form-options {
  width: 100%;
  max-width: 280px; /* 与输入框对齐 */
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  font-size: 12px;
  padding: 0 4px;
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #7f8c8d;
  cursor: pointer;
}

.forgot-pwd {
  color: #4b70e2;
  text-decoration: none;
  transition: 0.3s;
}

.forgot-pwd:hover {
  text-decoration: underline;
}

/* 按钮 */
.submit-btn {
  width: 100%;
  max-width: 280px; /* 与输入框对齐 */
  height: 48px;
  background: linear-gradient(135deg, #4b70e2 0%, #3557d1 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 10px 20px -10px rgba(75, 112, 226, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 15px 25px -10px rgba(75, 112, 226, 0.6);
}

.submit-btn:active:not(:disabled) {
  transform: translateY(0);
}

.submit-btn:disabled {
  background: #a0a5a8;
  cursor: not-allowed;
  box-shadow: none;
}

/* 覆盖层面板 */
.overlay-container {
  position: absolute;
  top: 0;
  left: 50%;
  width: 50%;
  height: 100%;
  overflow: hidden;
  transition: transform 0.6s ease-in-out;
  z-index: 100;
}

.overlay-container.is-register {
  transform: translateX(-100%);
}

.overlay {
  background: linear-gradient(135deg, #4b70e2 0%, #9d50bb 100%);
  color: #ffffff;
  position: relative;
  left: -100%;
  height: 100%;
  width: 200%;
  transform: translateX(0);
  transition: transform 0.6s ease-in-out;
}

.overlay-container.is-register .overlay {
  transform: translateX(50%);
}

.overlay-panel {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 0 40px;
  text-align: center;
  top: 0;
  height: 100%;
  width: 50%;
  transform: translateX(0);
  transition: transform 0.6s ease-in-out;
}

.overlay-panel h2 {
  font-size: 30px;
  font-weight: 700;
  margin-bottom: 15px;
}

.overlay-panel p {
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 30px;
  opacity: 0.9;
  max-width: 280px; /* 限制段落宽度以便居中对齐 */
}

.overlay-left {
  transform: translateX(-20%);
}

.overlay-container.is-register .overlay-left {
  transform: translateX(0);
}

.overlay-right {
  right: 0;
  transform: translateX(0);
}

.overlay-container.is-register .overlay-right {
  transform: translateX(20%);
}

.ghost-btn {
  background-color: transparent;
  border: 2px solid #ffffff;
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
  padding: 10px 35px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.ghost-btn:hover {
  background: #ffffff;
  color: #4b70e2;
}

/* 响应式微调 */
@media (max-width: 900px) {
  .main-container {
    width: 95%;
    height: 500px;
  }
}
</style>
