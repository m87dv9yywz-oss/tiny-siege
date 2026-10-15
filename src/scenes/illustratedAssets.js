// Share Phaser's loader without queueing the whole illustrated collection.
export function requestTexture(scene, key, url) {
  if (scene.textures.exists(key)) return Promise.resolve(true);
  scene.artLoads ||= new Map();
  scene.artFailures ||= new Map();
  if (scene.artLoads.has(key)) return scene.artLoads.get(key);
  if ((scene.artFailures.get(key) || 0) > Date.now()) return Promise.resolve(false);
  const pending = new Promise(resolve => {
    const complete = () => finish(true);
    const error = file => { if (file.key === key) finish(false); };
    const finish = ok => {
      scene.load.off(`filecomplete-image-${key}`, complete);
      scene.load.off('loaderror', error);
      scene.artLoads.delete(key);
      if (!ok) scene.artFailures.set(key, Date.now() + 10000);
      resolve(ok);
    };
    scene.load.once(`filecomplete-image-${key}`, complete);
    scene.load.on('loaderror', error);
    scene.load.image(key, url);
  });
  scene.artLoads.set(key, pending);
  if (!scene.load.isLoading()) scene.load.start();
  return pending;
}
