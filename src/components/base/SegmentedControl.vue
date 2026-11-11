<script setup lang="ts" generic="T extends string">
defineProps<{
    options: { id: T; label: string }[]
    modelValue: T
    ariaLabel: string
}>()

const emit = defineEmits<{
    'update:modelValue': [id: T]
}>()
</script>

<template>
    <div class="options" role="group" :aria-label="ariaLabel">
        <button v-for="option in options" :key="option.id" type="button" class="option"
            :class="{ 'is-selected': modelValue === option.id }" :aria-pressed="modelValue === option.id"
            @click="emit('update:modelValue', option.id)">
            <slot name="option" :option="option">{{ option.label }}</slot>
        </button>
    </div>
</template>

<style scoped lang="scss">
.options {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 1.2rem;
    padding: 0.4rem;
    border: 1px solid var(--layout-border-color);
    border-radius: 1rem;
    background: var(--options-bg-color);

    .option {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.7rem 1rem;
        border: none;
        border-radius: 0.7rem;
        background: transparent;
        color: var(--text-color-secondary);
        font: inherit;
        font-size: 1.2rem;
        font-weight: 500;
        cursor: pointer;

        &.is-selected {
            background: #2a313c;
            color: var(--text-color-primary);
        }

        &:hover:not(.is-selected) {
            background: rgba(255, 255, 255, 0.04);
        }

        &:focus-visible {
            outline: 1px solid var(--text-color-secondary);
            outline-offset: 2px;
        }
    }
}
</style>
