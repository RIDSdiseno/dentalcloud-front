/**
 * Personaje animado del asistente (solo presentación: no toca la lógica del chat).
 *
 * Tres variantes según el tipo de clínica:
 *  - dental   → un diente (celeste)
 *  - estetica → una gota de sérum con destello (rosado)
 *  - ambas    → un diente con destello y degradado celeste→rosado
 *
 * Estados (los decide AssistantBubble según lo que está pasando):
 *  idle      → flota y parpadea
 *  attentive → panel abierto, mira al usuario
 *  typing    → el usuario escribe, mira hacia el campo de texto
 *  thinking  → esperando a la IA / transcribiendo: mira arriba y salen puntitos
 *  listening → micrófono abierto: ojos grandes y ondas de sonido
 *  speaking  → leyendo la respuesta en voz alta: mueve la boca
 *  happy     → acaba de responder: sonríe con los ojos
 *
 * Es SVG + CSS puro (sin librerías). Respeta "reducir movimiento" del sistema.
 */

export type MascotVariant = 'dental' | 'estetica' | 'ambas';
export type MascotState = 'idle' | 'attentive' | 'typing' | 'thinking' | 'listening' | 'speaking' | 'happy';

const PALETTE: Record<MascotVariant, { a: string; b: string; ink: string }> = {
  dental: { a: '#00aeef', b: '#0089c7', ink: '#0b3b5c' },
  estetica: { a: '#f472b6', b: '#db2f7a', ink: '#5b1235' },
  ambas: { a: '#00aeef', b: '#db2f7a', ink: '#2b2350' },
};

// Diente (corona redondeada con dos raíces cortas) y gota.
const TOOTH =
  'M50 15C59 9 79 9 83 29C86 45 79 55 77 68C75 81 71 91 64 91C57 91 57 76 50 76C43 76 43 91 36 91C29 91 25 81 23 68C21 55 14 45 17 29C21 9 41 9 50 15Z';
const DROP = 'M50 9C61 24 82 39 82 60C82 78 68 91 50 91C32 91 18 78 18 60C18 39 39 24 50 9Z';

const CSS = `
.fdcm{--fdcm-float:3.6s;display:block;overflow:visible}
.fdcm *{transform-box:fill-box}
.fdcm .fdcm-body{transform-origin:50% 100%;animation:fdcm-float var(--fdcm-float) ease-in-out infinite}
.fdcm .fdcm-shadow{transform-origin:50% 50%;animation:fdcm-shadow var(--fdcm-float) ease-in-out infinite}
.fdcm .fdcm-eye{transform-origin:50% 50%;animation:fdcm-blink 4.8s infinite}
.fdcm .fdcm-eye.r{animation-delay:.04s}
.fdcm .fdcm-eyes{transition:transform .35s cubic-bezier(.3,1.4,.5,1),opacity .2s}
.fdcm .fdcm-spark{transform-origin:50% 50%;animation:fdcm-twinkle 2.4s ease-in-out infinite}
.fdcm .fdcm-mouth,.fdcm .fdcm-happy,.fdcm .fdcm-dots,.fdcm .fdcm-waves,.fdcm .fdcm-o,.fdcm .fdcm-talk{transition:opacity .2s}
.fdcm .fdcm-happy,.fdcm .fdcm-dots,.fdcm .fdcm-waves,.fdcm .fdcm-o,.fdcm .fdcm-talk{opacity:0}
.fdcm.is-attentive .fdcm-eyes{transform:translate(0,-1px)}
.fdcm.is-typing .fdcm-eyes{transform:translate(3px,3px)}
.fdcm.is-thinking .fdcm-eyes{transform:translate(-3px,-4px)}
.fdcm.is-thinking .fdcm-dots{opacity:1}
.fdcm.is-thinking .fdcm-dots circle{animation:fdcm-dot 1.1s ease-in-out infinite}
.fdcm.is-thinking .fdcm-dots circle:nth-child(2){animation-delay:.15s}
.fdcm.is-thinking .fdcm-dots circle:nth-child(3){animation-delay:.3s}
.fdcm.is-thinking .fdcm-mouth{opacity:0}
.fdcm.is-thinking .fdcm-o{opacity:1}
.fdcm.is-listening .fdcm-eye{animation:none;transform:scale(1.15)}
.fdcm.is-listening .fdcm-waves{opacity:1}
.fdcm.is-listening .fdcm-waves path{animation:fdcm-wave 1.2s ease-out infinite}
.fdcm.is-listening .fdcm-waves path:nth-child(2),.fdcm.is-listening .fdcm-waves path:nth-child(4){animation-delay:.3s}
.fdcm.is-listening .fdcm-mouth{opacity:0}
.fdcm.is-listening .fdcm-o{opacity:1}
.fdcm.is-speaking .fdcm-mouth{opacity:0}
.fdcm.is-speaking .fdcm-talk{opacity:1;transform-origin:50% 0;animation:fdcm-talk .32s ease-in-out infinite alternate}
.fdcm.is-happy .fdcm-eyes,.fdcm.is-happy .fdcm-mouth{opacity:0}
.fdcm.is-happy .fdcm-happy{opacity:1}
.fdcm.is-happy .fdcm-body{animation:fdcm-hop .6s cubic-bezier(.3,1.6,.5,1) 2}
.fdcm-hover:hover .fdcm .fdcm-body{animation:fdcm-wiggle .5s ease-in-out}
@keyframes fdcm-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes fdcm-shadow{0%,100%{transform:scaleX(1);opacity:.22}50%{transform:scaleX(.82);opacity:.14}}
@keyframes fdcm-blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.08)}}
@keyframes fdcm-twinkle{0%,100%{transform:scale(1) rotate(0);opacity:1}50%{transform:scale(.6) rotate(45deg);opacity:.7}}
@keyframes fdcm-dot{0%,100%{transform:translateY(0);opacity:.45}50%{transform:translateY(-3px);opacity:1}}
@keyframes fdcm-wave{0%{opacity:0;transform:scale(.7)}40%{opacity:1}100%{opacity:0;transform:scale(1.25)}}
@keyframes fdcm-talk{from{transform:scaleY(.35)}to{transform:scaleY(1)}}
@keyframes fdcm-hop{0%,100%{transform:translateY(0) scale(1)}40%{transform:translateY(-6px) scale(1.03,.97)}}
@keyframes fdcm-wiggle{0%,100%{transform:rotate(0)}30%{transform:rotate(-6deg)}70%{transform:rotate(5deg)}}
@media (prefers-reduced-motion:reduce){.fdcm *,.fdcm-hover:hover .fdcm .fdcm-body{animation:none!important;transition:none!important}}
`;

let cssInjected = false;
function useMascotCss() {
  if (cssInjected || typeof document === 'undefined') return;
  const el = document.createElement('style');
  el.setAttribute('data-fdc-mascot', '');
  el.textContent = CSS;
  document.head.appendChild(el);
  cssInjected = true;
}

/** Normaliza el tipo de clínica de cualquiera de los dos sistemas. */
export function mascotVariantFrom(tipo: string | null | undefined): MascotVariant {
  const t = String(tipo ?? '').toLowerCase();
  if (t === 'estetica' || t === 'esthetic') return 'estetica';
  if (t === 'ambas' || t === 'both') return 'ambas';
  return 'dental';
}

export function AssistantMascot({
  variant = 'dental',
  state = 'idle',
  size = 56,
  ground = true,
  className = '',
}: {
  variant?: MascotVariant;
  state?: MascotState;
  size?: number;
  /** Sombra en el "piso" (se apaga dentro del encabezado del panel). */
  ground?: boolean;
  className?: string;
}) {
  useMascotCss();
  const p = PALETTE[variant];
  const id = `fdcm-${variant}`;
  const shape = variant === 'estetica' ? DROP : TOOTH;
  const sparkle = variant !== 'dental';
  // La gota tiene la cara un poco más abajo.
  const fy = variant === 'estetica' ? 6 : 0;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden="true"
      className={`fdcm is-${state} ${className}`}
    >
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor={variant === 'estetica' ? '#fde7f1' : variant === 'ambas' ? '#f1ecfb' : '#e3f6fd'} />
        </linearGradient>
        <linearGradient id={`${id}-line`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={p.a} />
          <stop offset="1" stopColor={p.b} />
        </linearGradient>
      </defs>

      {ground && <ellipse className="fdcm-shadow" cx="50" cy="96" rx="22" ry="3.2" fill="#0f172a" />}

      <g className="fdcm-body">
        <path d={shape} fill={`url(#${id}-fill)`} stroke={`url(#${id}-line)`} strokeWidth="4.5" strokeLinejoin="round" />
        {/* brillo */}
        <path
          d={variant === 'estetica' ? 'M36 44C38 37 42 32 46 27' : 'M27 30C28 23 33 19 39 18'}
          fill="none"
          stroke="#ffffff"
          strokeWidth="4"
          strokeLinecap="round"
          opacity=".9"
        />

        {sparkle && (
          <path
            className="fdcm-spark"
            d="M80 8L82.6 15.4L90 18L82.6 20.6L80 28L77.4 20.6L70 18L77.4 15.4Z"
            fill={p.b}
          />
        )}

        {/* mejillas */}
        <ellipse cx="33" cy={57 + fy} rx="5" ry="3" fill={p.b} opacity=".16" />
        <ellipse cx="67" cy={57 + fy} rx="5" ry="3" fill={p.b} opacity=".16" />

        {/* ojos */}
        <g className="fdcm-eyes">
          <g className="fdcm-eye">
            <ellipse cx="39" cy={44 + fy} rx="4.6" ry="6" fill={p.ink} />
            <circle cx="40.6" cy={41.6 + fy} r="1.6" fill="#fff" />
          </g>
          <g className="fdcm-eye r">
            <ellipse cx="61" cy={44 + fy} rx="4.6" ry="6" fill={p.ink} />
            <circle cx="62.6" cy={41.6 + fy} r="1.6" fill="#fff" />
          </g>
        </g>

        {/* ojos felices ^ ^ */}
        <g className="fdcm-happy" fill="none" stroke={p.ink} strokeWidth="3.6" strokeLinecap="round">
          <path d={`M34 ${46 + fy}Q39 ${39 + fy} 44 ${46 + fy}`} />
          <path d={`M56 ${46 + fy}Q61 ${39 + fy} 66 ${46 + fy}`} />
          <path d={`M41 ${57 + fy}Q50 ${66 + fy} 59 ${57 + fy}`} />
        </g>

        {/* boca normal */}
        <path
          className="fdcm-mouth"
          d={`M44 ${57 + fy}Q50 ${62 + fy} 56 ${57 + fy}`}
          fill="none"
          stroke={p.ink}
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        {/* boca "o" (pensando / escuchando) */}
        <ellipse className="fdcm-o" cx="50" cy={59 + fy} rx="2.6" ry="3" fill={p.ink} />
        {/* boca hablando */}
        <ellipse className="fdcm-talk" cx="50" cy={57 + fy} rx="5" ry="4.4" fill={p.ink} />

        {/* pensando: puntitos */}
        <g className="fdcm-dots" fill={p.b}>
          <circle cx="40" cy="4" r="3" />
          <circle cx="50" cy="2" r="3" />
          <circle cx="60" cy="4" r="3" />
        </g>
      </g>

      {/* escuchando: ondas a los lados */}
      <g className="fdcm-waves" fill="none" stroke={p.b} strokeWidth="3" strokeLinecap="round">
        <path d="M8 42Q3 52 8 62" />
        <path d="M1 36Q-6 52 1 68" />
        <path d="M92 42Q97 52 92 62" />
        <path d="M99 36Q106 52 99 68" />
      </g>
    </svg>
  );
}
