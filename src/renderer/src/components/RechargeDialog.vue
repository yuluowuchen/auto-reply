<template>
  <el-dialog
    v-model="visible"
    title="账户充值"
    width="400px"
    append-to-body
    destroy-on-close
    class="recharge-dialog"
  >
    <el-form :model="form" label-width="80px" class="recharge-form">
      <el-form-item label="充值账户">
        <el-input v-model="form.user" placeholder="请输入充值账户" clearable />
      </el-form-item>
      
      <el-form-item label="充值类型">
        <el-radio-group v-model="form.kaClassId">
          <el-radio-button :label="41">月卡 (30元)</el-radio-button>
          <el-radio-button :label="42">年卡 (180元)</el-radio-button>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="支付方式">
        <el-radio-group v-model="form.payType">
          <el-radio label="支付宝PC">
            <div class="pay-option">
              <el-icon><CreditCard /></el-icon>
              <span>支付宝</span>
            </div>
          </el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="loading" @click="handleRecharge">
          确定充值
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { CreditCard } from '@element-plus/icons-vue'

const props = defineProps<{
  modelValue: boolean
  username?: string
}>()

const emit = defineEmits(['update:modelValue'])

const visible = ref(false)
const loading = ref(false)

const form = reactive({
  user: '',
  kaClassId: 41,
  payType: '支付宝PC'
})

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val && props.username) {
    form.user = props.username
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

const handleRecharge = async () => {
  if (!form.user) {
    ElMessage.warning('请输入充值账户')
    return
  }

  loading.value = true
  try {
    const res = await window.api.verify.payKaUsa({
      user: form.user,
      kaClassId: form.kaClassId,
      payType: form.payType
    })
    console.log(res)
    if (res.success && res.data?.Data?.PayURL) {
      ElMessage.success('正在打开支付页面...')
      
      // 在程序内部新窗口中打开支付链接
      window.electron.ipcRenderer.send('open-internal-window', res.data.Data.PayURL)
      visible.value = false
    } else {
      ElMessage.error(res.error || '获取支付链接失败')
    }
  } catch (error) {
    console.error('充值请求异常:', error)
    ElMessage.error('请求发起失败，请重试')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.recharge-form {
  padding-top: 10px;
}

.pay-option {
  display: flex;
  align-items: center;
  gap: 5px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
