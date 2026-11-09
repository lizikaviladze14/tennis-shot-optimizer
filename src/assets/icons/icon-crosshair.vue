<script setup lang="ts">
withDefaults(defineProps<{
    color?: string
}>(), {
    color: 'currentColor',
})
</script>

<template>
    <svg width="18px" height="18px" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" fill="none" :stroke="color"
        stroke-width="1.8" stroke-linecap="round">
        <circle cx="10" cy="10" r="6" />
        <circle cx="10" cy="10" r="1.6" :fill="color" stroke="none" />
        <path d="M10 1.5v3M10 15.5v3M1.5 10h3M15.5 10h3" />
    </svg>
</template>
