import { gsap } from 'gsap'
import { Observer } from 'gsap/Observer'
import { CustomEase } from 'gsap/CustomEase'
import { CustomWiggle } from 'gsap/CustomWiggle'
import { Physics2DPlugin } from 'gsap/Physics2DPlugin'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(Observer, CustomEase, CustomWiggle, Physics2DPlugin, ScrollTrigger)
export { gsap, Observer, CustomEase, CustomWiggle, Physics2DPlugin, ScrollTrigger }
