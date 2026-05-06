<script>
    import "../app.css";
</script>

<main>
    <slot />
</main>

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
