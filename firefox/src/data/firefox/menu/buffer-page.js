// Buffer Page
self.on("click", function () {
    self.postMessage({
      action: "buffer_click",
      documentUrl: document.URL
    });
})
