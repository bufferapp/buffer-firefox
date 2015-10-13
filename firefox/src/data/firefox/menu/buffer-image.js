self.on("click", function (node, data) {
    self.postMessage({
      nodeSrc: node.src,
      documentUrl: document.URL
    });
})
