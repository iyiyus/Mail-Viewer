<template>
  <ElConfigProvider :locale="zh">
    <RouterView />
  </ElConfigProvider>
</template>

<script setup lang="ts">
  import { ElConfigProvider } from 'element-plus'
  import zh from 'element-plus/es/locale/lang/zh-cn'
</script>
