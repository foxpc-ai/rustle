<script>
    import Toast from "$lib/components/Toast.svelte";
    import "../app.css";
</script>

<main>
    <slot />
</main>

<Toast />

<style>
    :global(body) {
        margin: 0;
        height: 100vh;
        width: 100vw;
        overflow: hidden;
        background-color: #f0f0f0;
    }

    main {
        height: 100vh;
        width: 100vw;
        overflow: hidden;
    }
</style>
