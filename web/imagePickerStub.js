function finish(settled, input, resolve, result) {
  if (settled.done) return;
  settled.done = true;
  input.remove();
  resolve(result);
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, 800 / Math.max(image.naturalWidth, image.naturalHeight, 1));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(url);
        reject(new Error('Photo could not be prepared'));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      let quality = 0.7;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);
      while (dataUrl.length > 700000 && quality > 0.35) {
        quality = Math.round((quality - 0.1) * 10) / 10;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }
      const comma = dataUrl.indexOf(',');
      resolve({
        uri: dataUrl,
        fileName: file.name.replace(/\.\w+$/, '.jpg'),
        type: 'image/jpeg',
        fileSize: file.size,
        width: canvas.width,
        height: canvas.height,
        base64: dataUrl.slice(comma + 1),
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Photo could not be read'));
    };
    image.src = url;
  });
}

function pickFiles(multiple) {
  return new Promise(resolve => {
    const input = document.createElement('input');
    const settled = {done: false};
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = !!multiple;
    input.style.display = 'none';
    input.onchange = async () => {
      const files = Array.from(input.files || []);
      if (!files.length) {
        finish(settled, input, resolve, {assets: [], didCancel: true});
        return;
      }
      try {
        const assets = await Promise.all(files.map(readImage));
        finish(settled, input, resolve, {assets, didCancel: false});
      } catch (error) {
        finish(settled, input, resolve, {
          assets: [],
          errorCode: 'others',
          errorMessage: error && error.message ? error.message : 'Could not read the photo.',
        });
      }
    };
    input.oncancel = () => finish(settled, input, resolve, {assets: [], didCancel: true});
    document.body.appendChild(input);
    input.click();
  });
}

export function launchCamera(_options, callback) {
  const pending = pickFiles(false);
  if (callback) pending.then(callback);
  return pending;
}

export function launchImageLibrary(options, callback) {
  const multiple = !options || options.selectionLimit !== 1;
  const pending = pickFiles(multiple);
  if (callback) pending.then(callback);
  return pending;
}

export default {launchCamera, launchImageLibrary};
