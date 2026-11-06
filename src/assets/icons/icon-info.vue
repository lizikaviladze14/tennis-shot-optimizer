<script setup lang="ts">
withDefaults(defineProps<{
    color?: string
}>(), {
    color: 'currentColor',
})
</script>

<template>
    <svg width="15px" height="15px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="none" :stroke="color"
        stroke-width="1.3" stroke-linecap="round">
        <circle cx="8" cy="8" r="6.5" />
        <line x1="8" y1="7.2" x2="8" y2="11" />
        <circle cx="8" cy="4.9" r="0.4" :fill="color" stroke="none" />
    </svg>
</template>
