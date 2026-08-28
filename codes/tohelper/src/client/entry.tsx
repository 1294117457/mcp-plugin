import { TohelperApp } from './components/App'

export const name = 'tohelper-ui'
export const inject = ['slots']

export function apply(ctx: any) {
  ctx.slots.inject('shell.overlay', function* () {
    yield ctx.slots.register(
      { name: 'shell.overlay', id: 'tohelper', order: 900, label: 'Tohelper' },
      () => <TohelperApp />,
    )
  })
}
