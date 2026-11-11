<script setup lang="ts">
interface Props {
    modelValue?: boolean
    disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    modelValue: false,
    disabled: false,
})

const emit = defineEmits<{
    'update:modelValue': [value: boolean]
}>()

function toggle() {
    if (props.disabled) return
    emit('update:modelValue', !props.modelValue)
}

function onKeydown(event: KeyboardEvent) {
    if (event.key !== ' ' && event.key !== 'Enter') return
    event.preventDefault()
    toggle()
}
</script>

<template>
    <div class="base-checkbox" :class="{ 'is-on': modelValue }" role="checkbox" :aria-checked="modelValue"
        :aria-disabled="disabled || undefined" :tabindex="disabled ? -1 : 0" @click="toggle" @keydown="onKeydown">
        <span class="box" />
        <slot />
    </div>
</template>

<style scoped lang="scss">
.base-checkbox {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    padding: 0.8rem 1.2rem;
    border: 1px solid var(--layout-border-color);
    border-radius: 1rem;
    background: transparent;
    color: var(--text-color-secondary);
    font: inherit;
    font-size: 1.2rem;
    font-weight: 500;
    line-height: 1;
    cursor: pointer;

    &.is-on {
        color: var(--text-color-primary);
        border-color: rgba(255, 255, 255, 0.28);
        background: var(--checkbox-bg-color);
    }

    &[aria-disabled='true'] {
        cursor: default;
    }

    &:focus-visible {
        outline: 1px solid var(--text-color-secondary);
        outline-offset: 2px;
    }
}

.box {
    width: 1.4rem;
    height: 1.4rem;
    border: 1px solid currentColor;
    border-radius: 0.3rem;
    display: inline-grid;
    place-items: center;
    flex-shrink: 0;
}

.is-on .box::after {
    content: '';
    width: 0.3rem;
    height: 0.55rem;
    border: solid currentColor;
    border-width: 0 0.15rem 0.15rem 0;
    transform: rotate(45deg) translate(-0.05rem, -0.1rem);
}
</style>
