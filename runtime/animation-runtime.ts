import { gsap } from 'gsap'
import { Observer } from 'gsap/Observer'
import { CustomEase } from 'gsap/CustomEase'
import { CustomWiggle } from 'gsap/CustomWiggle'
import { Physics2DPlugin } from 'gsap/Physics2DPlugin'

gsap.registerPlugin(Observer, CustomEase, CustomWiggle, Physics2DPlugin)
export { gsap, Observer, CustomEase, CustomWiggle, Physics2DPlugin }
