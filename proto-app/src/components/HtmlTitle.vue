<script>
export default {
  name: 'HtmlTitle',
  props: ['title'],
  render: () => null,
  watch: {
    title: {
      immediate: true,
      handler() {
        document.title = this.title;
      }
    }
  },
}
</script>
