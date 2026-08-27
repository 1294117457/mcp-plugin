declare var spine: any

export type MascotState = 'idle' | 'open' | 'walk' | 'jump' | 'run'

const ANIMATION_MAP: Record<MascotState, { name: string; loop: boolean }> = {
  idle: { name: 'test1', loop: true },
  open: { name: 'test1', loop: true },
  walk: { name: 'test1', loop: true },
  jump: { name: 'test1', loop: false },
  run: { name: 'test1', loop: true },
}

export interface MascotController {
  canvas: HTMLCanvasElement
  setState(state: MascotState): void
  playOnce(animation: string, thenState?: MascotState): void
  resize(width: number, height: number): void
  dispose(): void
}

export async function createMascot(
  width: number,
  height: number,
  basePath: string,
): Promise<MascotController> {
  if (typeof spine === 'undefined' || !spine.webgl) {
    throw new Error('spine 3.8 webgl runtime not loaded')
  }

  const pixelRatio = window.devicePixelRatio ?? 2
  const canvas = document.createElement('canvas')
  canvas.width = width * pixelRatio
  canvas.height = height * pixelRatio
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`

  const gl = canvas.getContext('webgl', {
    alpha: true,
    premultipliedAlpha: false,
  }) as WebGLRenderingContext

  if (!gl) throw new Error('WebGL unavailable')

  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

  const context = new spine.webgl.ManagedWebGLRenderingContext(gl)
  const shader = spine.webgl.Shader.newTwoColoredTextured(context)
  const batcher = new spine.webgl.PolygonBatcher(context)
  const skeletonRenderer = new spine.webgl.SkeletonRenderer(context)
  const assetManager = new spine.webgl.AssetManager(context, basePath)

  const mvp = new spine.webgl.Matrix4()
  mvp.ortho2d(0, 0, canvas.width, canvas.height)
  gl.viewport(0, 0, canvas.width, canvas.height)

  assetManager.loadText('skeleton.json')
  assetManager.loadTextureAtlas('skeleton.atlas')

  await new Promise<void>((resolve, reject) => {
    const check = () => {
      if (assetManager.isLoadingComplete()) {
        if (assetManager.hasErrors()) {
          reject(new Error('Spine asset load failed: ' + JSON.stringify(assetManager.getErrors())))
        } else {
          resolve()
        }
      } else {
        requestAnimationFrame(check)
      }
    }
    check()
  })

  const atlas = assetManager.get('skeleton.atlas')
  const atlasLoader = new spine.AtlasAttachmentLoader(atlas)
  const skeletonJson = new spine.SkeletonJson(atlasLoader)
  skeletonJson.scale = 0.18 * pixelRatio

  const skeletonData = skeletonJson.readSkeletonData(assetManager.get('skeleton.json'))
  const skeleton = new spine.Skeleton(skeletonData)
  skeleton.setToSetupPose()

  skeleton.x = canvas.width / 2
  skeleton.y = canvas.height * 0.05

  const stateData = new spine.AnimationStateData(skeletonData)
  stateData.defaultMix = 0.3
  const animationState = new spine.AnimationState(stateData)

  const firstAnim = skeletonData.findAnimation('test1') || skeletonData.animations[0]
  if (firstAnim) animationState.setAnimation(0, firstAnim.name, true)

  skeleton.updateWorldTransform()

  let currentState: MascotState = 'idle'
  let disposed = false
  let lastTime = Date.now() / 1000
  let rafId = 0

  function render(): void {
    if (disposed) return

    const now = Date.now() / 1000
    const delta = Math.min(now - lastTime, 0.1)
    lastTime = now

    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)

    animationState.update(delta)
    animationState.apply(skeleton)
    skeleton.updateWorldTransform()

    shader.bind()
    shader.setUniformi(spine.webgl.Shader.SAMPLER, 0)
    shader.setUniform4x4f(spine.webgl.Shader.MVP_MATRIX, mvp.values)

    batcher.begin(shader)
    skeletonRenderer.premultipliedAlpha = false
    skeletonRenderer.draw(batcher, skeleton)
    batcher.end()

    shader.unbind()

    rafId = requestAnimationFrame(render)
  }

  rafId = requestAnimationFrame(render)

  return {
    canvas,

    setState(state: MascotState) {
      if (state === currentState) return
      currentState = state
      const anim = ANIMATION_MAP[state]
      if (anim && skeletonData.findAnimation(anim.name)) {
        animationState.setAnimation(0, anim.name, anim.loop)
      }
    },

    playOnce(animation: string, thenState?: MascotState) {
      if (skeletonData.findAnimation(animation)) {
        animationState.setAnimation(0, animation, false)
        if (thenState) {
          const next = ANIMATION_MAP[thenState]
          if (next && skeletonData.findAnimation(next.name)) {
            animationState.addAnimation(0, next.name, next.loop, 0)
          }
        }
      }
    },

    resize(w: number, h: number) {
      canvas.width = w * pixelRatio
      canvas.height = h * pixelRatio
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      mvp.ortho2d(0, 0, canvas.width, canvas.height)
      gl.viewport(0, 0, canvas.width, canvas.height)
      skeleton.x = canvas.width / 2
      skeleton.y = canvas.height * 0.05
    },

    dispose() {
      disposed = true
      cancelAnimationFrame(rafId)
      animationState.clearTracks()
      animationState.clearListeners()
      assetManager.removeAll()
      ;(assetManager as any).dispose?.()
    },
  }
}
