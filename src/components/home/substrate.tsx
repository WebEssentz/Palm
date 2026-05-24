'use client'

import { useRef, useEffect } from 'react'
import { useTheme } from 'next-themes'

// ─── Tuning ────────────────────────────────────────────────────────────────
const BOID_COUNT   = 200          // safe to go higher now with O(n)
const RD_SCALE     = 8
const RD_STEPS     = 2
const DU=0.2097, DV=0.1050, FEED=0.0545, KILL=0.0620
const SEP_R=28,  ALIGN_R=60,  COH_R=80
const MAX_SPEED=1.8, MAX_FORCE=0.07
const SEP_W=1.6, ALIGN_W=0.35, COH_W=0.25, CHEM_W=0.9
const VORTEX_STR=6000, FLEE_R=130, FLEE_STR=280
const LINE_R2=2500  // 50px²
// Cell must cover the largest query radius
const CELL = COH_R  // 80px → each query checks 9 cells

// ─── Spatial Hash — O(1) insert, O(1) query ────────────────────────────────
class SpatialHash {
    private cells = new Map<number, number[]>()

    clear() { this.cells.clear() }

    private key(cx: number, cy: number) {
        // Large coprime pair avoids key collisions across axes
        return cx * 100003 + cy
    }

    insert(i: number, x: number, y: number) {
        const k = this.key(Math.floor(x/CELL), Math.floor(y/CELL))
        let c = this.cells.get(k)
        if (!c) { c = []; this.cells.set(k, c) }
        c.push(i)
    }

    // Returns all indices in the 3×3 cell neighbourhood
    nearby(x: number, y: number): number[] {
        const cx = Math.floor(x/CELL), cy = Math.floor(y/CELL)
        const out: number[] = []
        for (let dy=-1; dy<=1; dy++)
        for (let dx=-1; dx<=1; dx++) {
            const c = this.cells.get(this.key(cx+dx, cy+dy))
            if (c) for (const i of c) out.push(i)
        }
        return out
    }
}

// ─── Gray-Scott ────────────────────────────────────────────────────────────
class RDGrid {
    cols: number; rows: number
    u: Float32Array; v: Float32Array
    nu: Float32Array; nv: Float32Array

    constructor(cols: number, rows: number) {
        this.cols=cols; this.rows=rows
        const n=cols*rows
        this.u=new Float32Array(n).fill(1); this.v=new Float32Array(n)
        this.nu=new Float32Array(n);        this.nv=new Float32Array(n)
        for (let i=0; i<35; i++) {
            const cx=Math.floor(Math.random()*cols), cy=Math.floor(Math.random()*rows)
            for (let dy=-2;dy<=2;dy++) for (let dx=-2;dx<=2;dx++) {
                const idx=this.w(cx+dx,cy+dy)
                this.v[idx]=1; this.u[idx]=0
            }
        }
    }

    w(x: number, y: number) {
        return (((y%this.rows)+this.rows)%this.rows)*this.cols
             + (((x%this.cols)+this.cols)%this.cols)
    }

    step() {
        const {cols,rows,u,v,nu,nv}=this
        for (let y=0;y<rows;y++) for (let x=0;x<cols;x++) {
            const i=y*cols+x, ui=u[i], vi=v[i]
            const lu=u[this.w(x-1,y)]+u[this.w(x+1,y)]+u[this.w(x,y-1)]+u[this.w(x,y+1)]-4*ui
            const lv=v[this.w(x-1,y)]+v[this.w(x+1,y)]+v[this.w(x,y-1)]+v[this.w(x,y+1)]-4*vi
            const uvv=ui*vi*vi
            nu[i]=Math.max(0,Math.min(1,ui+DU*lu-uvv+FEED*(1-ui)))
            nv[i]=Math.max(0,Math.min(1,vi+DV*lv+uvv-(FEED+KILL)*vi))
        }
        this.u.set(nu); this.v.set(nv)
    }

    inject(wx: number, wy: number) {
        const cx=Math.floor(wx/RD_SCALE), cy=Math.floor(wy/RD_SCALE)
        for (let dy=-3;dy<=3;dy++) for (let dx=-3;dx<=3;dx++) {
            const i=this.w(cx+dx,cy+dy)
            this.v[i]=Math.min(1,this.v[i]+0.45)
            this.u[i]=Math.max(0,this.u[i]-0.25)
        }
    }

    getV(wx: number, wy: number) {
        return this.v[this.w(Math.floor(wx/RD_SCALE),Math.floor(wy/RD_SCALE))]
    }

    grad(wx: number, wy: number): [number,number] {
        const cx=Math.floor(wx/RD_SCALE), cy=Math.floor(wy/RD_SCALE)
        return [
            (this.v[this.w(cx+1,cy)]-this.v[this.w(cx-1,cy)])*0.5,
            (this.v[this.w(cx,cy+1)]-this.v[this.w(cx,cy-1)])*0.5,
        ]
    }
}

// ─── Helpers ───────────────────────────────────────────────────────────────
interface Boid { x:number; y:number; vx:number; vy:number }

function clamp(vx:number,vy:number,max:number):[number,number] {
    const m=Math.sqrt(vx*vx+vy*vy)
    return m>max ? [vx/m*max,vy/m*max] : [vx,vy]
}

function steer(bvx:number,bvy:number,tx:number,ty:number):[number,number] {
    const m=Math.sqrt(tx*tx+ty*ty)
    if(m===0) return [0,0]
    const dx=tx/m*MAX_SPEED-bvx, dy=ty/m*MAX_SPEED-bvy
    return clamp(dx,dy,MAX_FORCE)
}

// ─── Component ─────────────────────────────────────────────────────────────
export default function Substrate() {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const themeRef  = useRef('dark')
    const { resolvedTheme } = useTheme()

    useEffect(() => { themeRef.current = resolvedTheme ?? 'dark' }, [resolvedTheme])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')!

        let W=window.innerWidth, H=window.innerHeight
        canvas.width=W; canvas.height=H

        let rd=new RDGrid(Math.ceil(W/RD_SCALE),Math.ceil(H/RD_SCALE))
        const hash=new SpatialHash()

        const boids: Boid[] = Array.from({length:BOID_COUNT},()=>({
            x:Math.random()*W, y:Math.random()*H,
            vx:(Math.random()-.5)*2, vy:(Math.random()-.5)*2,
        }))

        let mx=-9999, my=-9999, animId: number

        const onMove=(e:MouseEvent)=>{ mx=e.clientX; my=e.clientY; rd.inject(mx,my) }
        const onResize=()=>{
            W=window.innerWidth; H=window.innerHeight
            canvas.width=W; canvas.height=H
            rd=new RDGrid(Math.ceil(W/RD_SCALE),Math.ceil(H/RD_SCALE))
        }
        window.addEventListener('mousemove',onMove)
        window.addEventListener('resize',onResize)

        function frame() {
            // ① Gray-Scott
            for (let s=0;s<RD_STEPS;s++) rd.step()

            // ② Rebuild spatial hash — O(n)
            hash.clear()
            for (let i=0;i<boids.length;i++) hash.insert(i,boids[i].x,boids[i].y)

            // ③ Update boids — O(n) with hash
            for (let i=0;i<boids.length;i++) {
                const b=boids[i]
                let sx=0,sy=0,sn=0, ax=0,ay=0,an=0, cx=0,cy=0,cn=0

                for (const j of hash.nearby(b.x,b.y)) {
                    if (i===j) continue
                    const o=boids[j]
                    const dx=b.x-o.x, dy=b.y-o.y
                    const d=Math.sqrt(dx*dx+dy*dy)
                    if (d<SEP_R&&d>0) { sx+=dx/d; sy+=dy/d; sn++ }
                    if (d<ALIGN_R)    { ax+=o.vx;  ay+=o.vy;  an++ }
                    if (d<COH_R)      { cx+=o.x;   cy+=o.y;   cn++ }
                }

                let fx=0, fy=0
                if (sn>0){ const[a,b2]=steer(b.vx,b.vy,sx/sn,sy/sn); fx+=a*SEP_W;   fy+=b2*SEP_W }
                if (an>0){ const[a,b2]=steer(b.vx,b.vy,ax/an,ay/an); fx+=a*ALIGN_W;  fy+=b2*ALIGN_W }
                if (cn>0){ const[a,b2]=steer(b.vx,b.vy,cx/cn-b.x,cy/cn-b.y); fx+=a*COH_W; fy+=b2*COH_W }

                // Vortex
                const cdx=b.x-mx, cdy=b.y-my, cr2=cdx*cdx+cdy*cdy+1
                fx+=(-cdy*VORTEX_STR)/cr2; fy+=(cdx*VORTEX_STR)/cr2

                // Flee
                const cd=Math.sqrt(cr2)
                if (cd<FLEE_R){ const f=FLEE_STR*(1-cd/FLEE_R)/(cd+1); fx+=cdx/cd*f; fy+=cdy/cd*f }

                // Chemotaxis
                const[gx,gy]=rd.grad(b.x,b.y)
                fx+=gx*CHEM_W; fy+=gy*CHEM_W

                b.vx+=fx; b.vy+=fy;
                [b.vx,b.vy]=clamp(b.vx,b.vy,MAX_SPEED)
                b.x+=b.vx; b.y+=b.vy
                if(b.x<0)b.x+=W; else if(b.x>W)b.x-=W
                if(b.y<0)b.y+=H; else if(b.y>H)b.y-=H
            }

            // ④ Render
            ctx.clearRect(0,0,W,H)
            const light=themeRef.current==='light'
            const rgb=light?'80,60,30':'255,255,255'

            // Lines — only between spatial hash neighbours
            ctx.lineWidth=0.5
            for (let i=0;i<boids.length;i++) {
                for (const j of hash.nearby(boids[i].x,boids[i].y)) {
                    if (j<=i) continue  // canonical pair: smaller index first
                    const dx=boids[i].x-boids[j].x, dy=boids[i].y-boids[j].y
                    const d2=dx*dx+dy*dy
                    if (d2<LINE_R2) {
                        const alpha=(1-d2/LINE_R2)*(light?.06:.05)
                        ctx.strokeStyle=`rgba(${rgb},${alpha.toFixed(3)})`
                        ctx.beginPath()
                        ctx.moveTo(boids[i].x,boids[i].y)
                        ctx.lineTo(boids[j].x,boids[j].y)
                        ctx.stroke()
                    }
                }
            }

            // Dots
            for (const b of boids) {
                const v=rd.getV(b.x,b.y)
                const alpha=light?.12+v*.5:.15+v*.6
                const r=1.2+v*1.8
                ctx.beginPath()
                ctx.arc(b.x,b.y,r,0,Math.PI*2)
                ctx.fillStyle=`rgba(${rgb},${alpha.toFixed(3)})`
                ctx.fill()
            }

            animId=requestAnimationFrame(frame)
        }

        frame()
        return ()=>{ cancelAnimationFrame(animId); window.removeEventListener('mousemove',onMove); window.removeEventListener('resize',onResize) }
    },[])

    return (
        <canvas
            ref={canvasRef}
            className='absolute inset-0 pointer-events-none'
            style={{ zIndex: 0 }}
        />
    )
}
