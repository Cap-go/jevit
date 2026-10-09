import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

export const tap = () => Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
export const thud = () => Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {})
export const buzz = (good: boolean) =>
  Haptics.notification({ type: good ? NotificationType.Success : NotificationType.Warning }).catch(() => {})
