import { useEffect } from 'react';

const protectMedia = (root: ParentNode): void => {
  root.querySelectorAll('img, video, audio, canvas').forEach((element) => {
    if (element instanceof HTMLImageElement) element.draggable = false;
    if (element instanceof HTMLMediaElement && element.controls) {
      element.controlsList.add('nodownload');
      if (element instanceof HTMLVideoElement) element.disablePictureInPicture = true;
    }
  });
};

export const ContentMediaProtection = () => {
  useEffect(() => {
    const blockMediaContextMenu = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      if (event.target.closest('img, video, audio, canvas, [data-protected-content]')) event.preventDefault();
    };
    const blockMediaDrag = (event: DragEvent) => {
      if (!(event.target instanceof Element)) return;
      if (event.target.closest('img, video, audio, canvas, [data-protected-content]')) event.preventDefault();
    };

    protectMedia(document);
    document.addEventListener('contextmenu', blockMediaContextMenu, true);
    document.addEventListener('dragstart', blockMediaDrag, true);

    const observer = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach((node) => {
        if (node instanceof Element) {
          if (node.matches('img, video, audio, canvas')) {
            if (node instanceof HTMLImageElement) node.draggable = false;
            if (node instanceof HTMLMediaElement && node.controls) {
              node.controlsList.add('nodownload');
              if (node instanceof HTMLVideoElement) node.disablePictureInPicture = true;
            }
          }
          protectMedia(node);
        }
      }));
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      document.removeEventListener('contextmenu', blockMediaContextMenu, true);
      document.removeEventListener('dragstart', blockMediaDrag, true);
    };
  }, []);

  return null;
};
