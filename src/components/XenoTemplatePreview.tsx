'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { TemplateProps } from './LandingTemplates'

/** Maps variant name → public folder + emoji */
const XENO_VARIANTS = {
  xeno:    { folder: '/templates/xeno/',    emoji: '🎨' },
  xenoAi:  { folder: '/templates/xeno-ai/', emoji: '🤖' },
  xenoDs:  { folder: '/templates/xeno-ds/', emoji: '🖌️' },
  xenoMa:  { folder: '/templates/xeno-ma/', emoji: '📣' },
  xenoWa:  { folder: '/templates/xeno-wa/', emoji: '🌐' },
  xenoMin: { folder: '/templates/xeno-min/', emoji: '⬛' },
  xenoSu:  { folder: '/templates/xeno-su/',  emoji: '🚀' },
  xenoPf:  { folder: '/templates/xeno-pf/',  emoji: '📂' },
  xenoCo:  { folder: '/templates/xeno-co/',  emoji: '💼' },
  xenoRe:  { folder: '/templates/xeno-re/',  emoji: '🍽️' },
  xenoInf: { folder: '/templates/xeno-inf/', emoji: '⭐' },
  xenoLaw: { folder: '/templates/xeno-law/', emoji: '⚖️' },
  xenoFit: { folder: '/templates/xeno-fit/', emoji: '💪' },
  xenoEdu: { folder: '/templates/xeno-edu/', emoji: '📚' },
  xenoMed: { folder: '/templates/xeno-med/', emoji: '🏥' },
  xenoEv:  { folder: '/templates/xeno-ev/',  emoji: '💒' },
  xenoRl:  { folder: '/templates/xeno-rl/',  emoji: '🏠' },
  xenoPh:  { folder: '/templates/xeno-ph/',  emoji: '📸' },
  xenoTra: { folder: '/templates/xeno-tra/', emoji: '✈️' },
  xenoEco: { folder: '/templates/xeno-eco/', emoji: '🌿' },
  xenoMus: { folder: '/templates/xeno-mus/', emoji: '🎵' },
  xenoBar: { folder: '/templates/xeno-bar/', emoji: '💈' },
  xenoCafe: { folder: '/templates/xeno-cafe/', emoji: '☕' },
  xenoPet: { folder: '/templates/xeno-pet/', emoji: '🐾' },
  xenoArc: { folder: '/templates/xeno-arc/', emoji: '🏛️' },
  xenoYog: { folder: '/templates/xeno-yog/', emoji: '🧘' },
  xenoAut: { folder: '/templates/xeno-aut/', emoji: '🚗' },
  xenoDen: { folder: '/templates/xeno-den/', emoji: '🦷' },
  xenoFlo: { folder: '/templates/xeno-flo/', emoji: '🌸' },
  xenoBak: { folder: '/templates/xeno-bak/', emoji: '🧁' },
  xenoSpa: { folder: '/templates/xeno-spa/', emoji: '💆' },
  xenoNgo: { folder: '/templates/xeno-ngo/', emoji: '❤️' },
  xenoPod: { folder: '/templates/xeno-pod/', emoji: '🎙️' },
  xenoCry: { folder: '/templates/xeno-cry/', emoji: '🪙' },
  xenoFas: { folder: '/templates/xeno-fas/', emoji: '👗' },
  xenoInt: { folder: '/templates/xeno-int/', emoji: '🛋️' },
  xenoDj:  { folder: '/templates/xeno-dj/',  emoji: '🎧' },
  xenoAcc: { folder: '/templates/xeno-acc/', emoji: '📊' },
  xenoPlm: { folder: '/templates/xeno-plm/', emoji: '🔧' },
  xenoDay: { folder: '/templates/xeno-day/', emoji: '👶' },
  xenoChu: { folder: '/templates/xeno-chu/', emoji: '⛪' },
  xenoIns: { folder: '/templates/xeno-ins/', emoji: '🛡️' },
  xenoVet: { folder: '/templates/xeno-vet/', emoji: '🐕' },
  xenoPhr: { folder: '/templates/xeno-phr/', emoji: '💊' },
  xenoLog: { folder: '/templates/xeno-log/', emoji: '📦' },
  xenoAgr: { folder: '/templates/xeno-agr/', emoji: '🌾' },
  xenoWne: { folder: '/templates/xeno-wne/', emoji: '🍷' },
  xenoBrw: { folder: '/templates/xeno-brw/', emoji: '🍺' },
  xenoTat: { folder: '/templates/xeno-tat/', emoji: '✒️' },
  xenoCln: { folder: '/templates/xeno-cln/', emoji: '🧹' },
  xenoSec: { folder: '/templates/xeno-sec/', emoji: '🔒' },
  xenoMov: { folder: '/templates/xeno-mov/', emoji: '🚚' },
  xenoWed: { folder: '/templates/xeno-wed/', emoji: '💍' },
  xenoHtl: { folder: '/templates/xeno-htl/', emoji: '🏨' },
  xenoGol: { folder: '/templates/xeno-gol/', emoji: '⛳' },
  xenoMar: { folder: '/templates/xeno-mar/', emoji: '🥋' },
  xenoDnc: { folder: '/templates/xeno-dnc/', emoji: '💃' },
  xenoThr: { folder: '/templates/xeno-thr/', emoji: '🎭' },
  xenoMsm: { folder: '/templates/xeno-msm/', emoji: '🖼️' },
  xenoRec: { folder: '/templates/xeno-rec/', emoji: '👔' },
  xenoBld: { folder: '/templates/xeno-bld/', emoji: '🏗️' },
  xenoSol: { folder: '/templates/xeno-sol/', emoji: '☀️' },
  xenoJwl: { folder: '/templates/xeno-jwl/', emoji: '💎' },
  xenoOpt: { folder: '/templates/xeno-opt/', emoji: '👓' },
  xenoChi: { folder: '/templates/xeno-chi/', emoji: '🦴' },
  xenoPsy: { folder: '/templates/xeno-psy/', emoji: '🧠' },
  xenoNut: { folder: '/templates/xeno-nut/', emoji: '🥗' },
  xenoCok: { folder: '/templates/xeno-cok/', emoji: '👨‍🍳' },
  xenoLnd: { folder: '/templates/xeno-lnd/', emoji: '🌳' },
  xenoPrn: { folder: '/templates/xeno-prn/', emoji: '🖨️' },
  xenoCwh: { folder: '/templates/xeno-cwh/', emoji: '🚿' },
  xenoLau: { folder: '/templates/xeno-lau/', emoji: '👕' },
  xenoNrs: { folder: '/templates/xeno-nrs/', emoji: '👴' },
  xenoGrc: { folder: '/templates/xeno-grc/', emoji: '🛒' },
  xenoBks: { folder: '/templates/xeno-bks/', emoji: '📕' },
  xenoGam: { folder: '/templates/xeno-gam/', emoji: '🎮' },
  xenoSpt: { folder: '/templates/xeno-spt/', emoji: '⚽' },
  xenoCam: { folder: '/templates/xeno-cam/', emoji: '🏕️' },
  xenoDiv: { folder: '/templates/xeno-div/', emoji: '🤿' },
  xenoBnk: { folder: '/templates/xeno-bnk/', emoji: '🏦' },
  xenoApt: { folder: '/templates/xeno-apt/', emoji: '🏢' },
} as const

type XenoVariant = keyof typeof XENO_VARIANTS

// ---------------------------------------------------------------------------
// Inline-editing script injected into every template iframe
// ---------------------------------------------------------------------------
const EDITING_SCRIPT = `
<style>
  /* Hide preloader */
  .preloader { display: none !important; }

  /* Force-show AOS animated elements immediately */
  [data-aos] {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }

  /* Disable smooth-scroll wrappers that may collapse content */
  #smooth-wrapper, #smooth-content {
    transform: none !important;
  }

  /* Prevent template pseudo-element overlays from blocking editable elements */
  *::before, *::after {
    pointer-events: none !important;
  }

  /* ---- Editable text hover/focus ---- */
  [data-phoxta-editable] {
    cursor: text;
    outline: none;
    transition: box-shadow 0.15s ease, background 0.15s ease;
    border-radius: 3px;
    position: relative;
  }
  [data-phoxta-editable]:hover {
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.35);
  }
  [data-phoxta-editable]:focus {
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.6);
    background: rgba(59, 130, 246, 0.04);
  }

  /* ---- Delete button (shared) ---- */
  .phoxta-del-btn {
    position: absolute;
    top: -8px; right: -8px;
    width: 20px; height: 20px;
    border-radius: 50%;
    background: #ef4444;
    color: #fff;
    border: 2px solid #fff;
    font-size: 12px; line-height: 16px;
    text-align: center;
    cursor: pointer;
    z-index: 9999;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700;
    box-shadow: 0 1px 4px rgba(0,0,0,0.25);
    padding: 0;
  }
  [data-phoxta-editable]:hover > .phoxta-del-btn,
  .phoxta-img-wrap:hover > .phoxta-del-btn {
    opacity: 1;
    pointer-events: auto;
  }

  /* ---- Per-text AI generate button ---- */
  .phoxta-text-ai-btn {
    position: absolute;
    top: -8px; right: 14px;
    width: 20px; height: 20px;
    border-radius: 50%;
    background: linear-gradient(135deg, #8b5cf6, #6366f1);
    color: #fff;
    border: 2px solid #fff;
    font-size: 10px;
    cursor: pointer;
    z-index: 9999;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 1px 4px rgba(99,102,241,0.35);
    padding: 0;
  }
  .phoxta-text-ai-btn svg {
    width: 12px; height: 12px;
  }
  [data-phoxta-editable]:hover > .phoxta-text-ai-btn {
    opacity: 1;
    pointer-events: auto;
  }
  .phoxta-text-ai-btn:hover {
    background: linear-gradient(135deg, #7c3aed, #4f46e5);
    transform: scale(1.1);
  }
  .phoxta-text-ai-btn.phoxta-text-ai-loading {
    opacity: 1;
    pointer-events: none;
    cursor: wait;
  }
  .phoxta-text-ai-btn .phoxta-ai-spinner {
    width: 10px; height: 10px;
    border: 1.5px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: phoxta-spin 0.6s linear infinite;
  }

  /* ---- Editable image hover overlay ---- */
  .phoxta-img-wrap {
    position: relative;
    display: inline-block;
    cursor: pointer;
    z-index: 5;
  }
  .phoxta-img-wrap .phoxta-img-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0);
    transition: background 0.15s ease;
    pointer-events: none;
    border-radius: inherit;
    display: flex; align-items: center; justify-content: center;
    color: transparent;
    font-size: 14px; font-weight: 600;
  }
  .phoxta-img-wrap:hover .phoxta-img-overlay {
    background: rgba(0,0,0,0.45);
    color: #fff;
  }
  .phoxta-img-wrap:hover img {
    filter: brightness(0.7);
    transition: filter 0.15s ease;
  }

  /* ---- Section reset button ---- */
  .phoxta-section-wrap {
    position: relative;
  }
  .phoxta-section-wrap:hover > .phoxta-reset-btn {
    opacity: 1;
    pointer-events: auto;
  }
  .phoxta-reset-btn {
    position: absolute;
    top: 10px; right: 10px;
    z-index: 10000;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease, transform 0.15s ease;
    background: #fff;
    border: 1.5px solid #d1d5db;
    border-radius: 8px;
    padding: 5px 10px;
    cursor: pointer;
    display: flex; align-items: center; gap: 5px;
    font-size: 12px; font-weight: 600;
    color: #374151;
    box-shadow: 0 2px 8px rgba(0,0,0,0.12);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  .phoxta-reset-btn:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
    transform: scale(1.04);
  }
  .phoxta-reset-btn svg {
    width: 14px; height: 14px;
    flex-shrink: 0;
  }

  /* ---- Section delete button ---- */
  .phoxta-section-wrap:hover > .phoxta-section-del-btn {
    opacity: 1;
    pointer-events: auto;
  }
  .phoxta-section-del-btn {
    position: absolute;
    top: 10px; right: 120px;
    z-index: 10000;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease, transform 0.15s ease;
    background: #fff;
    border: 1.5px solid #fca5a5;
    border-radius: 8px;
    padding: 5px 10px;
    cursor: pointer;
    display: flex; align-items: center; gap: 5px;
    font-size: 12px; font-weight: 600;
    color: #dc2626;
    box-shadow: 0 2px 8px rgba(220,38,38,0.12);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  .phoxta-section-del-btn:hover {
    background: #fef2f2;
    border-color: #f87171;
    transform: scale(1.04);
    box-shadow: 0 4px 12px rgba(220,38,38,0.2);
  }
  .phoxta-section-del-btn svg {
    width: 14px; height: 14px;
    flex-shrink: 0;
  }

  /* ---- Link edit button ---- */
  a[data-phoxta-link] {
    position: relative;
  }
  .phoxta-link-btn {
    position: absolute;
    bottom: -8px; left: 50%; transform: translateX(-50%);
    width: auto; height: 22px;
    border-radius: 6px;
    background: #2563eb;
    color: #fff;
    border: 2px solid #fff;
    font-size: 10px; line-height: 18px;
    text-align: center;
    cursor: pointer;
    z-index: 9999;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease;
    display: flex; align-items: center; gap: 3px;
    font-weight: 600;
    box-shadow: 0 1px 4px rgba(0,0,0,0.25);
    padding: 0 6px;
    white-space: nowrap;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  .phoxta-link-btn svg {
    width: 12px; height: 12px; flex-shrink: 0;
  }
  a[data-phoxta-link]:hover > .phoxta-link-btn {
    opacity: 1;
    pointer-events: auto;
  }

  /* ---- Link edit popover ---- */
  .phoxta-link-popover {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%; transform: translateX(-50%);
    z-index: 10001;
    background: #fff;
    border: 1.5px solid #d1d5db;
    border-radius: 10px;
    padding: 8px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    display: flex; align-items: center; gap: 6px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    min-width: 280px;
  }
  .phoxta-link-popover input {
    flex: 1;
    border: 1.5px solid #d1d5db;
    border-radius: 6px;
    padding: 4px 8px;
    font-size: 12px;
    outline: none;
    color: #111;
    min-width: 0;
  }
  .phoxta-link-popover input:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37,99,235,0.2);
  }
  .phoxta-link-popover button {
    border: none;
    border-radius: 6px;
    padding: 4px 10px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }
  .phoxta-link-save {
    background: #2563eb; color: #fff;
  }
  .phoxta-link-save:hover { background: #1d4ed8; }
  .phoxta-link-cancel {
    background: #f3f4f6; color: #374151;
  }
  .phoxta-link-cancel:hover { background: #e5e7eb; }

  /* ---- Floating character formatting toolbar ---- */
  .phoxta-fmt-toolbar {
    position: absolute;
    z-index: 15000;
    display: flex;
    align-items: center;
    gap: 2px;
    background: #1e1e22;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 10px;
    padding: 4px 6px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.35);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    pointer-events: auto;
    animation: phoxta-fmt-in 0.12s ease-out;
    white-space: nowrap;
  }
  @keyframes phoxta-fmt-in {
    0% { opacity: 0; transform: translateY(4px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  .phoxta-fmt-toolbar::after {
    content: '';
    position: absolute;
    bottom: -5px;
    left: 50%;
    transform: translateX(-50%);
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 5px solid #1e1e22;
  }
  .phoxta-fmt-btn {
    width: 28px; height: 28px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: rgba(255,255,255,0.6);
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px;
    font-weight: 600;
    transition: all 0.1s ease;
    padding: 0;
    flex-shrink: 0;
    font-family: inherit;
    line-height: 1;
  }
  .phoxta-fmt-btn:hover {
    background: rgba(255,255,255,0.1);
    color: #fff;
  }
  .phoxta-fmt-btn.active {
    background: rgba(99,102,241,0.3);
    color: #a5b4fc;
  }
  .phoxta-fmt-btn svg {
    width: 14px; height: 14px;
    flex-shrink: 0;
  }
  .phoxta-fmt-sep {
    width: 1px; height: 18px;
    background: rgba(255,255,255,0.1);
    margin: 0 3px;
    flex-shrink: 0;
  }
  .phoxta-fmt-size {
    display: flex;
    align-items: center;
    gap: 0;
    background: rgba(255,255,255,0.06);
    border-radius: 6px;
    overflow: hidden;
  }
  .phoxta-fmt-size button {
    width: 24px; height: 28px;
    border: none; background: transparent;
    color: rgba(255,255,255,0.6);
    cursor: pointer;
    font-size: 14px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.1s ease;
    padding: 0;
  }
  .phoxta-fmt-size button:hover {
    background: rgba(255,255,255,0.1);
    color: #fff;
  }
  .phoxta-fmt-size span {
    font-size: 10px;
    color: rgba(255,255,255,0.45);
    min-width: 28px;
    text-align: center;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    user-select: none;
  }
  .phoxta-fmt-color-wrapper {
    position: relative;
    width: 28px; height: 28px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.1s ease;
  }
  .phoxta-fmt-color-wrapper:hover {
    background: rgba(255,255,255,0.1);
  }
  .phoxta-fmt-color-wrapper input[type="color"] {
    position: absolute;
    inset: 0;
    opacity: 0;
    width: 100%; height: 100%;
    cursor: pointer;
    border: none;
    padding: 0;
  }
  .phoxta-fmt-color-swatch {
    width: 16px; height: 16px;
    border-radius: 4px;
    border: 2px solid rgba(255,255,255,0.25);
    pointer-events: none;
  }

  /* Highlight ring when navigating from layers */
  @keyframes phoxta-pulse {
    0% { box-shadow: 0 0 0 3px rgba(99,102,241,0.6); }
    100% { box-shadow: 0 0 0 3px rgba(99,102,241,0); }
  }
  .phoxta-highlight {
    animation: phoxta-pulse 1s ease-out;
  }

  /* ---- Text edit popup ---- */
  .phoxta-text-popup-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.35);
    z-index: 20000;
    display: flex; align-items: center; justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  .phoxta-text-popup {
    background: #fff;
    border-radius: 14px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.2);
    width: 480px;
    max-width: 92vw;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: phoxta-pop-in 0.18s ease-out;
  }
  @keyframes phoxta-pop-in {
    0% { transform: scale(0.92); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }
  .phoxta-text-popup-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 18px;
    border-bottom: 1px solid #e5e7eb;
  }
  .phoxta-text-popup-header span {
    font-size: 14px; font-weight: 700;
    color: #111827;
  }
  .phoxta-text-popup-close {
    background: none; border: none;
    font-size: 20px; color: #9ca3af;
    cursor: pointer; line-height: 1;
    padding: 0 2px;
  }
  .phoxta-text-popup-close:hover { color: #374151; }
  .phoxta-text-popup-body {
    padding: 16px 18px;
    flex: 1;
    overflow-y: auto;
  }
  .phoxta-text-popup-body textarea {
    width: 100%;
    min-height: 120px;
    border: 1.5px solid #d1d5db;
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 14px;
    line-height: 1.55;
    color: #111827;
    resize: vertical;
    outline: none;
    font-family: inherit;
    box-sizing: border-box;
  }
  .phoxta-text-popup-body textarea:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
  }
  .phoxta-text-popup-tag {
    display: inline-block;
    margin-bottom: 8px;
    font-size: 11px;
    font-weight: 600;
    color: #6366f1;
    background: #ede9fe;
    padding: 2px 8px;
    border-radius: 4px;
    text-transform: uppercase;
  }
  .phoxta-text-popup-footer {
    display: flex; align-items: center; justify-content: flex-end; gap: 8px;
    padding: 12px 18px;
    border-top: 1px solid #e5e7eb;
  }
  .phoxta-text-popup-footer button {
    border: none;
    border-radius: 8px;
    padding: 8px 18px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }
  .phoxta-text-popup-save {
    background: #6366f1; color: #fff;
  }
  .phoxta-text-popup-save:hover { background: #4f46e5; }
  .phoxta-text-popup-cancel {
    background: #f3f4f6; color: #374151;
  }
  .phoxta-text-popup-cancel:hover { background: #e5e7eb; }
  .phoxta-text-popup-ai {
    background: linear-gradient(135deg, #8b5cf6, #6366f1);
    color: #fff;
    display: flex; align-items: center; gap: 5px;
    margin-right: auto;
  }
  .phoxta-text-popup-ai:hover { background: linear-gradient(135deg, #7c3aed, #4f46e5); }
  .phoxta-text-popup-ai:disabled {
    opacity: 0.7; cursor: wait;
  }
  .phoxta-text-popup-ai svg {
    width: 14px; height: 14px;
  }
  .phoxta-text-popup-ai .phoxta-ai-spinner {
    width: 12px; height: 12px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: phoxta-spin 0.6s linear infinite;
  }

  /* ---- Image adjust/zoom toolbar ---- */
  .phoxta-img-toolbar {
    position: absolute;
    bottom: 8px; left: 50%; transform: translateX(-50%);
    z-index: 10;
    display: flex; align-items: center; gap: 3px;
    background: rgba(0,0,0,0.78);
    backdrop-filter: blur(6px);
    border-radius: 8px;
    padding: 3px 5px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  .phoxta-img-wrap:hover .phoxta-img-toolbar {
    opacity: 1;
    pointer-events: auto;
  }
  .phoxta-img-toolbar button {
    width: 24px; height: 24px;
    border: none;
    border-radius: 5px;
    background: rgba(255,255,255,0.12);
    color: #fff;
    font-size: 14px;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.1s ease;
    padding: 0;
  }
  .phoxta-img-toolbar button:hover {
    background: rgba(255,255,255,0.28);
  }
  .phoxta-img-toolbar button.active {
    background: rgba(59,130,246,0.55);
  }
  .phoxta-img-toolbar .phoxta-zoom-label {
    color: rgba(255,255,255,0.85);
    font-size: 10px;
    font-weight: 600;
    min-width: 34px;
    text-align: center;
    user-select: none;
  }
  .phoxta-img-toolbar .phoxta-tb-divider {
    width: 1px; height: 16px;
    background: rgba(255,255,255,0.2);
    margin: 0 1px;
    flex-shrink: 0;
  }
  .phoxta-img-wrap.phoxta-img-adjusting {
    overflow: hidden;
    cursor: grab;
  }
  .phoxta-img-wrap.phoxta-img-adjusting:active {
    cursor: grabbing;
  }
  .phoxta-img-wrap.phoxta-img-adjusting .phoxta-img-overlay {
    display: none !important;
  }
  .phoxta-img-wrap.phoxta-img-adjusting img {
    pointer-events: none;
    user-select: none;
  }
  /* Position hint badge while adjusting */
  .phoxta-pos-hint {
    position: absolute;
    top: 8px; left: 50%; transform: translateX(-50%);
    background: rgba(0,0,0,0.7);
    color: #fff;
    font-size: 10px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 4px;
    pointer-events: none;
    z-index: 11;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    opacity: 0;
    transition: opacity 0.15s ease;
  }
  .phoxta-img-wrap.phoxta-img-adjusting .phoxta-pos-hint {
    opacity: 1;
  }

  /* ---- Drag handle ---- */
  .phoxta-drag-handle {
    position: absolute;
    top: -8px; left: -8px;
    width: 20px; height: 20px;
    border-radius: 50%;
    background: #6366f1;
    color: #fff;
    border: 2px solid #fff;
    font-size: 10px;
    cursor: grab;
    z-index: 9999;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 1px 4px rgba(0,0,0,0.25);
    padding: 0;
  }
  [data-phoxta-editable]:hover > .phoxta-drag-handle,
  .phoxta-img-wrap:hover > .phoxta-drag-handle {
    opacity: 1;
    pointer-events: auto;
  }
  .phoxta-drag-handle:hover {
    background: #4f46e5;
  }
  .phoxta-drag-handle:active {
    cursor: grabbing;
  }

  /* ---- Dragging state & drop indicator ---- */
  .phoxta-dragging {
    opacity: 0.45 !important;
    outline: 2px dashed #6366f1 !important;
    outline-offset: 2px;
  }
  .phoxta-drop-indicator {
    height: 3px;
    background: #6366f1;
    border-radius: 2px;
    margin: 2px 0;
    pointer-events: none;
    box-shadow: 0 0 6px rgba(99,102,241,0.4);
  }

  /* ---- AI Generate button per section ---- */
  .phoxta-section-wrap:hover > .phoxta-ai-btn {
    opacity: 1;
    pointer-events: auto;
  }
  .phoxta-ai-btn {
    position: absolute;
    top: 10px; right: 180px;
    z-index: 10000;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease, transform 0.15s ease;
    background: linear-gradient(135deg, #8b5cf6, #6366f1);
    border: 1.5px solid rgba(255,255,255,0.25);
    border-radius: 8px;
    padding: 5px 10px;
    cursor: pointer;
    display: flex; align-items: center; gap: 5px;
    font-size: 12px; font-weight: 600;
    color: #fff;
    box-shadow: 0 2px 8px rgba(99,102,241,0.35);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  .phoxta-ai-btn:hover {
    background: linear-gradient(135deg, #7c3aed, #4f46e5);
    transform: scale(1.04);
    box-shadow: 0 4px 14px rgba(99,102,241,0.45);
  }
  .phoxta-ai-btn svg {
    width: 14px; height: 14px; flex-shrink: 0;
  }
  .phoxta-ai-btn.phoxta-ai-loading {
    opacity: 1;
    pointer-events: none;
    cursor: wait;
    background: linear-gradient(135deg, #a78bfa, #818cf8);
  }
  .phoxta-ai-btn .phoxta-ai-spinner {
    width: 14px; height: 14px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: phoxta-spin 0.6s linear infinite;
    flex-shrink: 0;
  }
  @keyframes phoxta-spin {
    to { transform: rotate(360deg); }
  }
</style>
<script>
document.addEventListener('DOMContentLoaded', function() {
  var editId = 0;
  var imgInstanceId = 0;
  var sectionSnapshots = {};  // id -> original innerHTML
  var sectionIdCounter = 0;

  // ---- Debounced HTML snapshot: sends clean edited HTML to parent ----
  var snapshotTimer = null;
  function notifyChange() {
    if (snapshotTimer) clearTimeout(snapshotTimer);
    snapshotTimer = setTimeout(function() {
      try {
        // Clone the document so we can strip editor UI without affecting live DOM
        var clone = document.documentElement.cloneNode(true);
        // Remove all editing UI elements
        var removeSelectors = [
          '.phoxta-del-btn', '.phoxta-drag-handle', '.phoxta-img-overlay',
          '.phoxta-img-toolbar', '.phoxta-pos-hint', '.phoxta-link-btn',
          '.phoxta-link-popover', '.phoxta-reset-btn',
          '.phoxta-text-popup-backdrop', '.phoxta-drop-indicator',
          '.phoxta-ai-btn', '.phoxta-text-ai-btn', '.phoxta-section-del-btn',
          '.phoxta-fmt-toolbar'
        ];
        removeSelectors.forEach(function(sel) {
          clone.querySelectorAll(sel).forEach(function(el) { el.remove(); });
        });
        // Unwrap images/videos from phoxta-img-wrap spans (restore original element)
        clone.querySelectorAll('.phoxta-img-wrap').forEach(function(wrap) {
          // Could contain <img>, <video>, or <iframe> (video embed)
          var child = wrap.querySelector('img, video, iframe');
          if (child && wrap.parentNode) {
            // Clean up video wrap styles that were added for aspect-ratio
            child.removeAttribute('data-phoxta-video');
            wrap.parentNode.insertBefore(child, wrap);
            wrap.remove();
          }
        });
        // Remove contenteditable and editing attributes
        clone.querySelectorAll('[contenteditable]').forEach(function(el) {
          el.removeAttribute('contenteditable');
          el.removeAttribute('spellcheck');
        });
        // Remove phoxta data attributes (they get re-added by editing script)
        clone.querySelectorAll('[data-phoxta-editable]').forEach(function(el) {
          el.removeAttribute('data-phoxta-editable');
        });
        clone.querySelectorAll('[data-phoxta-key]').forEach(function(el) {
          el.removeAttribute('data-phoxta-key');
        });
        clone.querySelectorAll('[data-phoxta-link]').forEach(function(el) {
          el.removeAttribute('data-phoxta-link');
        });
        clone.querySelectorAll('[data-phoxta-link-id]').forEach(function(el) {
          el.removeAttribute('data-phoxta-link-id');
        });
        clone.querySelectorAll('[data-phoxta-img-instance]').forEach(function(el) {
          el.removeAttribute('data-phoxta-img-instance');
          el.removeAttribute('data-phoxta-width');
          el.removeAttribute('data-phoxta-height');
        });
        clone.querySelectorAll('[data-phoxta-section-id]').forEach(function(el) {
          el.removeAttribute('data-phoxta-section-id');
          el.classList.remove('phoxta-section-wrap');
        });
        // Remove the injected editing <style> + <script>
        var scripts = clone.querySelectorAll('script');
        if (scripts.length > 0) {
          var lastScript = scripts[scripts.length - 1];
          var prev = lastScript.previousElementSibling;
          lastScript.remove();
          if (prev && prev.tagName === 'STYLE' && prev.textContent && prev.textContent.indexOf('phoxta') !== -1) {
            prev.remove();
          }
        }
        var html = '<!DOCTYPE html>\\n' + clone.outerHTML;
        window.parent.postMessage({ type: 'phoxta-html-snapshot', html: html }, '*');
      } catch(e) {}
      // Also broadcast updated layer tree after each change
      broadcastLayers();
    }, 300);
  }

  // ---- Broadcast layers tree to parent ----
  function broadcastLayers() {
    try {
      var sectionSelector = 'section, footer, header, nav';
      var sections = [];
      document.querySelectorAll(sectionSelector).forEach(function(sec) {
        if (sec.closest('.preloader')) return;
        var sid = sec.dataset.phoxtaSectionId || '';
        // Derive a friendly section name from tag, id, class or first heading
        var heading = sec.querySelector('h1, h2, h3');
        var name = '';
        if (heading) {
          name = heading.innerText.trim();
          if (name.length > 40) name = name.substring(0, 40) + '...';
        }
        if (!name) {
          var tag = sec.tagName.toLowerCase();
          name = tag.charAt(0).toUpperCase() + tag.slice(1);
          if (sec.id) name += ' #' + sec.id;
          else if (sec.className) {
            var cls = sec.className.split(/\s+/).filter(function(c) { return c.indexOf('phoxta') === -1; })[0];
            if (cls) name += ' .' + cls;
          }
        }
        var items = [];
        sec.querySelectorAll('[data-phoxta-editable]').forEach(function(el) {
          if (el.closest('.phoxta-reset-btn')) return;
          var text = el.innerText.trim();
          if (!text || text.length < 2) return;
          var tag = el.tagName.toLowerCase();
          var label = text.length > 35 ? text.substring(0, 35) + '...' : text;
          var key = el.dataset.phoxtaKey || '';
          items.push({ type: 'text', label: label, tag: tag, key: key, sectionId: sid });
        });
        sec.querySelectorAll('.phoxta-img-wrap').forEach(function(wrap) {
          var img = wrap.querySelector('img');
          if (!img) return;
          var alt = img.getAttribute('alt') || '';
          var label = alt ? (alt.length > 30 ? alt.substring(0, 30) + '...' : alt) : 'Image';
          var key = img.dataset.phoxtaImgInstance || '';
          items.push({ type: 'image', label: label, tag: 'img', key: key, sectionId: sid });
        });
        sec.querySelectorAll('a[data-phoxta-link]').forEach(function(anchor) {
          var text = anchor.innerText.trim();
          if (!text || text.length < 2) return;
          var label = text.length > 30 ? text.substring(0, 30) + '...' : text;
          var key = anchor.dataset.phoxtaLinkId || '';
          items.push({ type: 'link', label: label, tag: 'a', key: key, sectionId: sid });
        });
        sections.push({ id: sid, name: name, tag: sec.tagName.toLowerCase(), items: items });
      });
      window.parent.postMessage({ type: 'phoxta-layers-tree', sections: sections }, '*');
    } catch(e) {}
  }

  // ---- SVG icons ----
  var RESET_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>';
  var LINK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
  var AI_SPARKLE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z"/><path d="M5 3l.5 1.5L7 5l-1.5.5L5 7l-.5-1.5L3 5l1.5-.5L5 3z"/><path d="M19 17l.5 1.5L21 19l-1.5.5L19 21l-.5-1.5L17 19l1.5-.5L19 17z"/></svg>';

  // ---- Helper: create a delete button ----
  function createDeleteBtn(onDelete) {
    var btn = document.createElement('span');
    btn.className = 'phoxta-del-btn';
    btn.innerHTML = '&times;';
    btn.title = 'Delete this element';
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      onDelete();
    });
    return btn;
  }

  // ---- SVG icons for image toolbar & drag ----
  var GRIP_SVG = '<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><circle cx="3" cy="2" r="1.2"/><circle cx="7" cy="2" r="1.2"/><circle cx="3" cy="5" r="1.2"/><circle cx="7" cy="5" r="1.2"/><circle cx="3" cy="8" r="1.2"/><circle cx="7" cy="8" r="1.2"/></svg>';
  var MOVE_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>';

  // ---- Helper: create image toolbar (zoom + adjust/pan) ----
  function createImageToolbar(img, wrap) {
    var zoomLevel = 1;
    var posX = 50, posY = 50; // object-position percentages
    var adjustMode = false;

    // Position hint badge
    var posHint = document.createElement('span');
    posHint.className = 'phoxta-pos-hint';
    posHint.textContent = '50% 50%';
    wrap.appendChild(posHint);

    var toolbar = document.createElement('div');
    toolbar.className = 'phoxta-img-toolbar';

    var zoomOutBtn = document.createElement('button');
    zoomOutBtn.innerHTML = '\u2212';
    zoomOutBtn.title = 'Zoom out';

    var zoomLabel = document.createElement('span');
    zoomLabel.className = 'phoxta-zoom-label';
    zoomLabel.textContent = '100%';

    var zoomInBtn = document.createElement('button');
    zoomInBtn.innerHTML = '+';
    zoomInBtn.title = 'Zoom in';

    var divider = document.createElement('span');
    divider.className = 'phoxta-tb-divider';

    var adjustBtn = document.createElement('button');
    adjustBtn.innerHTML = MOVE_SVG;
    adjustBtn.title = 'Adjust position — drag to reposition image within frame';

    var resetZoomBtn = document.createElement('button');
    resetZoomBtn.innerHTML = '\u21BA';
    resetZoomBtn.title = 'Reset zoom & position';

    toolbar.appendChild(zoomOutBtn);
    toolbar.appendChild(zoomLabel);
    toolbar.appendChild(zoomInBtn);
    toolbar.appendChild(divider);
    toolbar.appendChild(adjustBtn);
    toolbar.appendChild(resetZoomBtn);

    function applyTransform() {
      // object-position pans the image within its object-fit:cover frame
      img.style.objectPosition = posX + '% ' + posY + '%';
      // transform scale zooms in further, keeping the viewed area centred on posX/posY
      if (zoomLevel !== 1) {
        img.style.transform = 'scale(' + zoomLevel + ')';
        img.style.transformOrigin = posX + '% ' + posY + '%';
      } else {
        img.style.transform = '';
        img.style.transformOrigin = '';
      }
      // Always clip overflow so zoomed/panned parts stay inside the placeholder
      wrap.style.overflow = 'hidden';
      zoomLabel.textContent = Math.round(zoomLevel * 100) + '%';
      posHint.textContent = Math.round(posX) + '% ' + Math.round(posY) + '%';
      notifyChange();
    }

    zoomInBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      if (zoomLevel < 3) { zoomLevel = Math.min(3, +(zoomLevel + 0.25).toFixed(2)); applyTransform(); }
    });

    zoomOutBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      if (zoomLevel > 1) { zoomLevel = Math.max(1, +(zoomLevel - 0.25).toFixed(2)); applyTransform(); }
    });

    adjustBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      adjustMode = !adjustMode;
      wrap.classList.toggle('phoxta-img-adjusting', adjustMode);
      adjustBtn.classList.toggle('active', adjustMode);
    });

    resetZoomBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      zoomLevel = 1; posX = 50; posY = 50; adjustMode = false;
      wrap.classList.remove('phoxta-img-adjusting');
      adjustBtn.classList.remove('active');
      applyTransform();
    });

    // Pan by dragging when in adjust mode — changes object-position
    var panning = false, startMX, startMY, startPosX, startPosY;

    wrap.addEventListener('mousedown', function(e) {
      if (!adjustMode) return;
      if (e.target.closest && e.target.closest('.phoxta-img-toolbar, .phoxta-del-btn, .phoxta-drag-handle')) return;
      e.preventDefault(); e.stopPropagation();
      panning = true; startMX = e.clientX; startMY = e.clientY;
      startPosX = posX; startPosY = posY;
    });

    document.addEventListener('mousemove', function(e) {
      if (!panning) return;
      var rect = wrap.getBoundingClientRect();
      // Drag right → show more of the left part of image → decrease posX
      var sensitivity = zoomLevel > 1 ? 80 / zoomLevel : 80;
      posX = Math.max(0, Math.min(100, startPosX - (e.clientX - startMX) / rect.width * sensitivity));
      posY = Math.max(0, Math.min(100, startPosY - (e.clientY - startMY) / rect.height * sensitivity));
      applyTransform();
    });

    document.addEventListener('mouseup', function() { panning = false; });

    return toolbar;
  }

  // ---- Helper: create drag handle for reordering elements ----
  function createDragHandle(dragTarget) {
    var handle = document.createElement('span');
    handle.className = 'phoxta-drag-handle';
    handle.innerHTML = GRIP_SVG;
    handle.title = 'Drag to reorder';

    var isDragging = false;
    var placeholder = null;

    handle.addEventListener('mousedown', function(e) {
      e.preventDefault(); e.stopPropagation();
      isDragging = true;
      dragTarget.classList.add('phoxta-dragging');

      placeholder = document.createElement('div');
      placeholder.className = 'phoxta-drop-indicator';
      var parent = dragTarget.parentNode;

      function onMove(ev) {
        if (!isDragging) return;
        var siblings = Array.from(parent.children).filter(function(c) {
          return c !== dragTarget && c !== placeholder &&
            !c.classList.contains('phoxta-reset-btn') &&
            !c.classList.contains('phoxta-drop-indicator');
        });

        var closest = null, closestDist = Infinity, before = true;
        siblings.forEach(function(sib) {
          var rect = sib.getBoundingClientRect();
          var midY = rect.top + rect.height / 2;
          var dist = Math.abs(ev.clientY - midY);
          if (dist < closestDist) { closestDist = dist; closest = sib; before = ev.clientY < midY; }
        });

        if (placeholder.parentNode) placeholder.remove();
        if (closest) {
          if (before) { parent.insertBefore(placeholder, closest); }
          else { parent.insertBefore(placeholder, closest.nextSibling); }
        }
      }

      function onUp() {
        isDragging = false;
        dragTarget.classList.remove('phoxta-dragging');
        if (placeholder && placeholder.parentNode) {
          parent.insertBefore(dragTarget, placeholder);
          placeholder.remove();
        }
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        notifyChange();
      }

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    return handle;
  }

  // ---- Floating character formatting toolbar ----
  var activeFormatEl = null;
  var fmtToolbar = null;

  function removeFmtToolbar() {
    if (fmtToolbar) { fmtToolbar.remove(); fmtToolbar = null; }
    activeFormatEl = null;
  }

  function positionFmtToolbar(el) {
    if (!fmtToolbar) return;
    var rect = el.getBoundingClientRect();
    var tbRect = fmtToolbar.getBoundingClientRect();
    var left = rect.left + (rect.width / 2) - (tbRect.width / 2);
    var top = rect.top - tbRect.height - 10;
    // Keep within viewport
    if (left < 4) left = 4;
    if (left + tbRect.width > window.innerWidth - 4) left = window.innerWidth - tbRect.width - 4;
    if (top < 4) { top = rect.bottom + 10; } // flip below if no room above
    fmtToolbar.style.left = left + 'px';
    fmtToolbar.style.top = top + 'px';
    fmtToolbar.style.position = 'fixed';
  }

  function getCurrentFontSize(el) {
    var sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && sel.focusNode) {
      var node = sel.focusNode.nodeType === 3 ? sel.focusNode.parentElement : sel.focusNode;
      if (node && el.contains(node)) {
        return Math.round(parseFloat(window.getComputedStyle(node).fontSize));
      }
    }
    return Math.round(parseFloat(window.getComputedStyle(el).fontSize));
  }

  function getCurrentColor(el) {
    var sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && sel.focusNode) {
      var node = sel.focusNode.nodeType === 3 ? sel.focusNode.parentElement : sel.focusNode;
      if (node && el.contains(node)) {
        return window.getComputedStyle(node).color;
      }
    }
    return window.getComputedStyle(el).color;
  }

  function rgbToHex(rgb) {
    if (rgb.indexOf('#') === 0) return rgb;
    var m = rgb.match(/(\d+)/g);
    if (!m || m.length < 3) return '#000000';
    return '#' + ((1 << 24) | (parseInt(m[0]) << 16) | (parseInt(m[1]) << 8) | parseInt(m[2])).toString(16).slice(1);
  }

  function updateFmtBtnStates() {
    if (!fmtToolbar) return;
    var btns = fmtToolbar.querySelectorAll('[data-fmt-cmd]');
    btns.forEach(function(btn) {
      var cmd = btn.getAttribute('data-fmt-cmd');
      try {
        if (document.queryCommandState(cmd)) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      } catch(e) {}
    });
    // Update size label
    if (activeFormatEl) {
      var sizeLabel = fmtToolbar.querySelector('.phoxta-fmt-size-label');
      if (sizeLabel) sizeLabel.textContent = getCurrentFontSize(activeFormatEl) + '';
      // Update color swatch
      var swatch = fmtToolbar.querySelector('.phoxta-fmt-color-swatch');
      var colorInput = fmtToolbar.querySelector('.phoxta-fmt-color-input');
      if (swatch) {
        var c = rgbToHex(getCurrentColor(activeFormatEl));
        swatch.style.background = c;
        if (colorInput) colorInput.value = c;
      }
    }
  }

  function showFmtToolbar(el) {
    if (activeFormatEl === el && fmtToolbar) {
      positionFmtToolbar(el);
      return;
    }
    removeFmtToolbar();
    activeFormatEl = el;

    var tb = document.createElement('div');
    tb.className = 'phoxta-fmt-toolbar';

    // Bold
    var boldBtn = document.createElement('button');
    boldBtn.className = 'phoxta-fmt-btn';
    boldBtn.setAttribute('data-fmt-cmd', 'bold');
    boldBtn.innerHTML = '<strong style="font-size:14px;pointer-events:none;">B</strong>';
    boldBtn.title = 'Bold (Ctrl+B)';
    boldBtn.addEventListener('mousedown', function(e) { e.preventDefault(); });
    boldBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      document.execCommand('bold', false, null);
      updateFmtBtnStates();
      notifyChange();
    });
    tb.appendChild(boldBtn);

    // Italic
    var italicBtn = document.createElement('button');
    italicBtn.className = 'phoxta-fmt-btn';
    italicBtn.setAttribute('data-fmt-cmd', 'italic');
    italicBtn.innerHTML = '<em style="font-size:14px;pointer-events:none;font-style:italic;">I</em>';
    italicBtn.title = 'Italic (Ctrl+I)';
    italicBtn.addEventListener('mousedown', function(e) { e.preventDefault(); });
    italicBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      document.execCommand('italic', false, null);
      updateFmtBtnStates();
      notifyChange();
    });
    tb.appendChild(italicBtn);

    // Underline
    var underlineBtn = document.createElement('button');
    underlineBtn.className = 'phoxta-fmt-btn';
    underlineBtn.setAttribute('data-fmt-cmd', 'underline');
    underlineBtn.innerHTML = '<span style="font-size:13px;text-decoration:underline;pointer-events:none;">U</span>';
    underlineBtn.title = 'Underline (Ctrl+U)';
    underlineBtn.addEventListener('mousedown', function(e) { e.preventDefault(); });
    underlineBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      document.execCommand('underline', false, null);
      updateFmtBtnStates();
      notifyChange();
    });
    tb.appendChild(underlineBtn);

    // Strikethrough
    var strikeBtn = document.createElement('button');
    strikeBtn.className = 'phoxta-fmt-btn';
    strikeBtn.setAttribute('data-fmt-cmd', 'strikeThrough');
    strikeBtn.innerHTML = '<span style="font-size:13px;text-decoration:line-through;pointer-events:none;">S</span>';
    strikeBtn.title = 'Strikethrough';
    strikeBtn.addEventListener('mousedown', function(e) { e.preventDefault(); });
    strikeBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      document.execCommand('strikeThrough', false, null);
      updateFmtBtnStates();
      notifyChange();
    });
    tb.appendChild(strikeBtn);

    // Separator
    var sep1 = document.createElement('span');
    sep1.className = 'phoxta-fmt-sep';
    tb.appendChild(sep1);

    // Font size controls
    var sizeGroup = document.createElement('span');
    sizeGroup.className = 'phoxta-fmt-size';
    var sizeDown = document.createElement('button');
    sizeDown.innerHTML = '\u2212';
    sizeDown.title = 'Decrease font size';
    sizeDown.addEventListener('mousedown', function(e) { e.preventDefault(); });
    sizeDown.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      changeFontSize(el, -1);
    });
    var sizeLabel = document.createElement('span');
    sizeLabel.className = 'phoxta-fmt-size-label';
    sizeLabel.textContent = getCurrentFontSize(el) + '';
    var sizeUp = document.createElement('button');
    sizeUp.innerHTML = '+';
    sizeUp.title = 'Increase font size';
    sizeUp.addEventListener('mousedown', function(e) { e.preventDefault(); });
    sizeUp.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      changeFontSize(el, 1);
    });
    sizeGroup.appendChild(sizeDown);
    sizeGroup.appendChild(sizeLabel);
    sizeGroup.appendChild(sizeUp);
    tb.appendChild(sizeGroup);

    // Separator
    var sep2 = document.createElement('span');
    sep2.className = 'phoxta-fmt-sep';
    tb.appendChild(sep2);

    // Color picker
    var colorWrap = document.createElement('span');
    colorWrap.className = 'phoxta-fmt-color-wrapper';
    colorWrap.title = 'Text color';
    var colorSwatch = document.createElement('span');
    colorSwatch.className = 'phoxta-fmt-color-swatch';
    colorSwatch.style.background = rgbToHex(getCurrentColor(el));
    var colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.className = 'phoxta-fmt-color-input';
    colorInput.value = rgbToHex(getCurrentColor(el));
    colorInput.addEventListener('input', function(e) {
      var val = e.target.value;
      colorSwatch.style.background = val;
      document.execCommand('foreColor', false, val);
      notifyChange();
    });
    colorWrap.appendChild(colorSwatch);
    colorWrap.appendChild(colorInput);
    tb.appendChild(colorWrap);

    fmtToolbar = tb;
    document.body.appendChild(tb);

    // Position after appending so we can measure
    requestAnimationFrame(function() {
      positionFmtToolbar(el);
      updateFmtBtnStates();
    });
  }

  function changeFontSize(el, delta) {
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      // No selection — change entire element
      var current = parseFloat(window.getComputedStyle(el).fontSize);
      var newSize = Math.max(8, Math.min(120, current + delta));
      el.style.fontSize = newSize + 'px';
    } else {
      var range = sel.getRangeAt(0);
      if (range.collapsed) {
        // Cursor in element, no selection — change entire element
        var currentSize = parseFloat(window.getComputedStyle(el).fontSize);
        var nextSize = Math.max(8, Math.min(120, currentSize + delta));
        el.style.fontSize = nextSize + 'px';
      } else {
        // Has selection — wrap in span
        var fragment = range.extractContents();
        var span = document.createElement('span');
        // Get size from first text node in selection
        var probe = fragment.firstChild;
        while (probe && probe.nodeType !== 3 && probe.firstChild) probe = probe.firstChild;
        var probeEl = probe && probe.nodeType === 3 ? probe.parentElement || el : probe || el;
        var sz = parseFloat(window.getComputedStyle(probeEl).fontSize || window.getComputedStyle(el).fontSize);
        var newSz = Math.max(8, Math.min(120, sz + delta));
        span.style.fontSize = newSz + 'px';
        span.appendChild(fragment);
        range.insertNode(span);
        // Reselect the span contents
        sel.removeAllRanges();
        var newRange = document.createRange();
        newRange.selectNodeContents(span);
        sel.addRange(newRange);
      }
    }
    var sizeLabel = fmtToolbar ? fmtToolbar.querySelector('.phoxta-fmt-size-label') : null;
    if (sizeLabel) sizeLabel.textContent = getCurrentFontSize(el) + '';
    notifyChange();
  }

  // Selection change tracking for formatting state updates
  document.addEventListener('selectionchange', function() {
    if (activeFormatEl) {
      updateFmtBtnStates();
    }
  });

  // Hide formatting toolbar when clicking outside an editable element
  document.addEventListener('mousedown', function(e) {
    if (!activeFormatEl) return;
    var target = e.target;
    // if clicking on toolbar itself, keep it
    if (fmtToolbar && fmtToolbar.contains(target)) return;
    // if clicking on the active element, keep it
    if (activeFormatEl.contains(target)) return;
    // if clicking on another editable, the focus handler will show new toolbar
    if (target.closest && target.closest('[data-phoxta-editable]')) return;
    removeFmtToolbar();
  }, true);

  // Reposition toolbar on scroll / resize
  window.addEventListener('scroll', function() { if (activeFormatEl && fmtToolbar) positionFmtToolbar(activeFormatEl); }, true);
  window.addEventListener('resize', function() { if (activeFormatEl && fmtToolbar) positionFmtToolbar(activeFormatEl); });

  // ---- Helper: show text‐edit popup for an element ----
  function showTextEditPopup(el) {
    // Remove any existing popup
    var oldPop = document.querySelector('.phoxta-text-popup-backdrop');
    if (oldPop) oldPop.remove();
    removeFmtToolbar();

    var key = el.dataset.phoxtaKey || '';
    var tag = el.tagName.toLowerCase();
    var isMultiLine = tag === 'p' || tag === 'blockquote' || tag === 'li' ||
      key.indexOf('description') !== -1 || key.indexOf('Description') !== -1 ||
      key.indexOf('excerpt') !== -1 || key.indexOf('text') !== -1;

    var backdrop = document.createElement('div');
    backdrop.className = 'phoxta-text-popup-backdrop';

    var popup = document.createElement('div');
    popup.className = 'phoxta-text-popup';

    // Header
    var header = document.createElement('div');
    header.className = 'phoxta-text-popup-header';
    var titleSpan = document.createElement('span');
    titleSpan.textContent = 'Edit Text';
    var closeBtn = document.createElement('button');
    closeBtn.className = 'phoxta-text-popup-close';
    closeBtn.innerHTML = '&times;';
    header.appendChild(titleSpan);
    header.appendChild(closeBtn);

    // Body
    var body = document.createElement('div');
    body.className = 'phoxta-text-popup-body';
    var tagBadge = document.createElement('span');
    tagBadge.className = 'phoxta-text-popup-tag';
    tagBadge.textContent = tag;
    body.appendChild(tagBadge);

    var textarea = document.createElement('textarea');
    textarea.value = el.innerText.trim();
    if (!isMultiLine) { textarea.style.minHeight = '48px'; textarea.rows = 2; }
    body.appendChild(textarea);

    // Footer
    var footer = document.createElement('div');
    footer.className = 'phoxta-text-popup-footer';
    var cancelBtn = document.createElement('button');
    cancelBtn.className = 'phoxta-text-popup-cancel';
    cancelBtn.textContent = 'Cancel';
    var saveBtn = document.createElement('button');
    saveBtn.className = 'phoxta-text-popup-save';
    saveBtn.textContent = 'Save';

    // AI generate button in popup
    var aiBtn = document.createElement('button');
    aiBtn.className = 'phoxta-text-popup-ai';
    aiBtn.innerHTML = AI_SPARKLE_SVG + '<span>AI Write</span>';
    aiBtn.title = 'Generate with AI';
    var aiPopupRequestId = null;

    footer.appendChild(aiBtn);
    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);

    popup.appendChild(header);
    popup.appendChild(body);
    popup.appendChild(footer);
    backdrop.appendChild(popup);
    document.body.appendChild(backdrop);

    setTimeout(function() { textarea.focus(); textarea.select(); }, 60);

    // Listen for AI text response inside the popup
    function handleAiTextResponse(ev) {
      if (!ev.data || ev.data.type !== 'phoxta-ai-text-content') return;
      if (ev.data.key !== key && ev.data.requestId !== aiPopupRequestId) return;
      window.removeEventListener('message', handleAiTextResponse);
      aiBtn.disabled = false;
      aiBtn.innerHTML = AI_SPARKLE_SVG + '<span>AI Write</span>';
      if (ev.data.error) return;
      if (ev.data.text) {
        textarea.value = ev.data.text;
        textarea.focus();
      }
    }

    function save() {
      var newVal = textarea.value.trim();
      if (newVal) {
        el.innerText = newVal;
        if (key) {
          window.parent.postMessage({ type: 'phoxta-edit', key: key, value: newVal }, '*');
        }
      }
      window.removeEventListener('message', handleAiTextResponse);
      backdrop.remove();
      notifyChange();
    }

    function cancel() { window.removeEventListener('message', handleAiTextResponse); backdrop.remove(); }

    saveBtn.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); save(); });
    cancelBtn.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); cancel(); });
    closeBtn.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); cancel(); });
    aiBtn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      if (aiBtn.disabled) return;
      aiBtn.disabled = true;
      aiBtn.innerHTML = '<span class="phoxta-ai-spinner"></span><span>Generating…</span>';
      aiPopupRequestId = 'popup_' + Date.now();
      window.addEventListener('message', handleAiTextResponse);
      window.parent.postMessage({
        type: 'phoxta-ai-text-generate',
        key: key,
        tag: tag,
        text: textarea.value.trim() || el.innerText.trim(),
        requestId: aiPopupRequestId,
      }, '*');
    });
    backdrop.addEventListener('click', function(e) { if (e.target === backdrop) cancel(); });
    textarea.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') { e.preventDefault(); cancel(); }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); }
    });
  }

  // ---- Helper: create per-text AI generate button ----
  function createTextAiBtn(el) {
    var btn = document.createElement('span');
    btn.className = 'phoxta-text-ai-btn';
    btn.innerHTML = AI_SPARKLE_SVG;
    btn.title = 'Generate with AI';
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (btn.classList.contains('phoxta-text-ai-loading')) return;
      btn.classList.add('phoxta-text-ai-loading');
      btn.innerHTML = '<span class="phoxta-ai-spinner"></span>';
      var key = el.dataset.phoxtaKey || '';
      var text = el.innerText.trim();
      var tag = el.tagName.toLowerCase();
      window.parent.postMessage({
        type: 'phoxta-ai-text-generate',
        key: key,
        tag: tag,
        text: text,
      }, '*');
    });
    return btn;
  }

  // ---- Helper: make an element editable ----
  function makeEditable(el, key) {
    if (el.dataset.phoxtaEditable) return;
    el.dataset.phoxtaEditable = 'true';
    el.setAttribute('contenteditable', 'true');
    el.setAttribute('spellcheck', 'false');
    el.dataset.phoxtaKey = key;

    var pos = window.getComputedStyle(el).position;
    if (pos === 'static') el.style.position = 'relative';

    el.appendChild(createDeleteBtn(function() {
      window.parent.postMessage({ type: 'phoxta-delete', key: key, elementType: 'text' }, '*');
      el.style.transition = 'opacity 0.2s ease, max-height 0.3s ease';
      el.style.opacity = '0';
      el.style.overflow = 'hidden';
      el.style.maxHeight = el.offsetHeight + 'px';
      setTimeout(function() {
        el.style.maxHeight = '0';
        el.style.margin = '0';
        el.style.padding = '0';
      }, 50);
      setTimeout(function() { el.remove(); notifyChange(); }, 350);
    }));

    el.appendChild(createDragHandle(el));
    el.appendChild(createTextAiBtn(el));

    // Show formatting toolbar on focus/click
    el.addEventListener('focus', function() {
      showFmtToolbar(el);
    });
    el.addEventListener('click', function() {
      showFmtToolbar(el);
    });

    el.addEventListener('blur', function(e) {
      // Don't hide toolbar if clicking into the toolbar itself
      var relTarget = e.relatedTarget;
      if (fmtToolbar && relTarget && fmtToolbar.contains(relTarget)) return;
      var k = el.dataset.phoxtaKey;
      var value = el.innerText.trim();
      if (k && value) {
        window.parent.postMessage({ type: 'phoxta-edit', key: k, value: value }, '*');
        notifyChange();
      }
      // Delay toolbar removal so click on toolbar buttons works
      setTimeout(function() {
        if (activeFormatEl === el && document.activeElement !== el) {
          removeFmtToolbar();
        }
      }, 150);
    });

    el.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        var tag = el.tagName.toLowerCase();
        var kk = el.dataset.phoxtaKey || '';
        var isMultiLine = tag === 'p' || tag === 'blockquote' || tag === 'li' ||
          kk.indexOf('description') !== -1 || kk.indexOf('Description') !== -1 ||
          kk.indexOf('excerpt') !== -1 || kk.indexOf('text') !== -1;
        if (!isMultiLine) { e.preventDefault(); el.blur(); }
      }
    });
  }

  // ---- Helper: make an image swappable (each instance unique) ----
  function makeImageEditable(img, baseKey) {
    if (img.closest('.phoxta-img-wrap')) return;

    var instanceKey = baseKey + '__inst_' + (imgInstanceId++);
    img.dataset.phoxtaImgInstance = instanceKey;

    var rect = img.getBoundingClientRect();
    var placeholderW = Math.round(rect.width) || img.naturalWidth || img.width || 400;
    var placeholderH = Math.round(rect.height) || img.naturalHeight || img.height || 300;
    img.dataset.phoxtaWidth = String(placeholderW);
    img.dataset.phoxtaHeight = String(placeholderH);

    var wrap = document.createElement('span');
    wrap.className = 'phoxta-img-wrap';
    var display = window.getComputedStyle(img).display;
    wrap.style.display = (display === 'block' || display === 'flex') ? 'block' : 'inline-block';
    wrap.style.position = 'relative';
    if (img.parentNode) {
      img.parentNode.insertBefore(wrap, img);
      wrap.appendChild(img);
    }

    var overlay = document.createElement('span');
    overlay.className = 'phoxta-img-overlay';
    overlay.textContent = '\\u{1F4F7} Click to change';
    wrap.appendChild(overlay);

    wrap.appendChild(createDeleteBtn(function() {
      window.parent.postMessage({ type: 'phoxta-delete', key: instanceKey, elementType: 'image' }, '*');
      wrap.style.transition = 'opacity 0.2s ease';
      wrap.style.opacity = '0';
      setTimeout(function() { wrap.remove(); notifyChange(); }, 250);
    }));

    wrap.appendChild(createImageToolbar(img, wrap));
    wrap.appendChild(createDragHandle(wrap));

    wrap.addEventListener('click', function(e) {
      if (e.target && e.target.closest && (e.target.closest('.phoxta-del-btn') || e.target.closest('.phoxta-img-toolbar') || e.target.closest('.phoxta-drag-handle'))) return;
      if (wrap.classList.contains('phoxta-img-adjusting')) return;
      e.preventDefault();
      e.stopPropagation();
      window.parent.postMessage({
        type: 'phoxta-image-click',
        imageKey: instanceKey,
        placeholderWidth: placeholderW,
        placeholderHeight: placeholderH
      }, '*');
    });
  }

  // ---- Helper: make a hyperlink's href editable ----
  function makeLinkEditable(anchor) {
    if (anchor.dataset.phoxtaLink) return;
    anchor.dataset.phoxtaLink = 'true';

    // Prevent default navigation inside the editor
    anchor.addEventListener('click', function(e) {
      // Allow clicks on child buttons/controls
      if (e.target && e.target.closest && (e.target.closest('.phoxta-link-btn') || e.target.closest('.phoxta-link-popover') || e.target.closest('.phoxta-del-btn'))) return;
      e.preventDefault();
    });

    var pos = window.getComputedStyle(anchor).position;
    if (pos === 'static') anchor.style.position = 'relative';

    // Link-edit button
    var linkBtn = document.createElement('span');
    linkBtn.className = 'phoxta-link-btn';
    linkBtn.innerHTML = LINK_SVG + '<span>Edit link</span>';
    linkBtn.title = 'Edit hyperlink URL';
    linkBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      showLinkPopover(anchor);
    });
    anchor.appendChild(linkBtn);
  }

  // ---- Show link editing popover ----
  function showLinkPopover(anchor) {
    // Remove any existing popover first
    var oldPop = anchor.querySelector('.phoxta-link-popover');
    if (oldPop) { oldPop.remove(); return; } // toggle off

    var popover = document.createElement('div');
    popover.className = 'phoxta-link-popover';

    var input = document.createElement('input');
    input.type = 'url';
    input.placeholder = 'https://example.com';
    input.value = anchor.getAttribute('href') || '';

    var saveBtn = document.createElement('button');
    saveBtn.className = 'phoxta-link-save';
    saveBtn.textContent = 'Save';

    var cancelBtn = document.createElement('button');
    cancelBtn.className = 'phoxta-link-cancel';
    cancelBtn.textContent = 'Cancel';

    popover.appendChild(input);
    popover.appendChild(saveBtn);
    popover.appendChild(cancelBtn);
    anchor.appendChild(popover);

    // Focus the input
    setTimeout(function() { input.focus(); input.select(); }, 50);

    function save() {
      var newHref = input.value.trim();
      if (newHref) {
        anchor.setAttribute('href', newHref);
        var linkKey = anchor.dataset.phoxtaKey || anchor.dataset.phoxtaLinkId || ('link_' + editId++);
        window.parent.postMessage({ type: 'phoxta-link-edit', key: linkKey, href: newHref, text: anchor.innerText.trim() }, '*');
      }
      popover.remove();
      notifyChange();
    }

    function cancel() { popover.remove(); }

    saveBtn.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); save(); });
    cancelBtn.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); cancel(); });
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); save(); }
      if (e.key === 'Escape') { e.preventDefault(); cancel(); }
    });
    // Prevent clicks inside popover from doing anything weird
    popover.addEventListener('click', function(e) { e.stopPropagation(); });
  }

  // ---- Setup editing for elements inside a container ----
  function setupEditingInContainer(container) {
    // Explicit data-phoxta
    container.querySelectorAll('[data-phoxta]').forEach(function(el) {
      makeEditable(el, el.getAttribute('data-phoxta'));
    });
    container.querySelectorAll('[data-phoxta-image]').forEach(function(img) {
      makeImageEditable(img, img.getAttribute('data-phoxta-image'));
    });

    // Auto-detect text
    var textSelectors = 'h1, h2, h3, h4, h5, h6, p, blockquote, li, .section-title, .section-sub-title';
    container.querySelectorAll(textSelectors).forEach(function(el) {
      if (el.dataset.phoxtaEditable) return;
      if (el.closest('[data-phoxta]')) return;
      if (el.closest('nav, header .primary-menu, .preloader, script, style, noscript')) return;
      var text = el.innerText.trim();
      if (!text || text.length < 2) return;

      var key = 'auto_' + (editId++);
      var sec = el.closest('section, footer, .xeno-hero, .xeno-about, .xeno-service, .xeno-project, .xeno-testimonial, .xeno-pricing, .xeno-blog, .xeno-team, .xeno-faq, .xeno-cta, .xeno-counter, .xeno-awards, .xeno-promo, .xeno-choose, .xeno-process, .xeno-company, .xeno-contact');
      if (sec) {
        var sectionClass = (sec.className || '').split(' ').find(function(c) { return c.indexOf('xeno') !== -1; }) || sec.tagName.toLowerCase();
        var tag = el.tagName.toLowerCase();
        key = sectionClass + '_' + tag + '_' + editId;
      }
      makeEditable(el, key);
    });

    // Auto-detect images
    container.querySelectorAll('img').forEach(function(img) {
      if (img.getAttribute('data-phoxta-image')) return;
      if (img.closest('.phoxta-img-wrap')) return;
      if (img.closest('nav, .preloader, .site-branding')) return;
      var src = img.getAttribute('src') || '';
      if (!src || src.indexOf('data:') === 0) return;
      var key = 'auto_img_' + (editId++);
      var alt = (img.getAttribute('alt') || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
      if (alt && alt.length > 2) key = 'img_' + alt;
      makeImageEditable(img, key);
    });

    // Auto-detect links
    container.querySelectorAll('a[href]').forEach(function(anchor) {
      if (anchor.dataset.phoxtaLink) return;
      if (anchor.closest('.preloader, .phoxta-reset-btn, .phoxta-section-del-btn, .phoxta-del-btn, .phoxta-link-btn, .phoxta-link-popover')) return;
      var href = anchor.getAttribute('href') || '';
      if (href === '#' || href === '' || href.indexOf('javascript:') === 0) {
        // Still make it editable so the user can set a real URL
      }
      anchor.dataset.phoxtaLinkId = 'link_' + (editId++);
      makeLinkEditable(anchor);
    });
  }

  // ---- Reset a section to its original HTML & re-init editing ----
  function resetSection(sectionEl) {
    var sid = sectionEl.dataset.phoxtaSectionId;
    if (!sid || !sectionSnapshots[sid]) return;
    sectionEl.innerHTML = sectionSnapshots[sid];
    setupEditingInContainer(sectionEl);
    // Re-add the reset button and layers panel (they were inside innerHTML and got wiped)
    addResetButton(sectionEl);
    addAiGenerateButton(sectionEl);
    // Notify parent
    window.parent.postMessage({ type: 'phoxta-reset-section', sectionId: sid }, '*');
    notifyChange();
  }

  // ---- Add a delete button to a section ----
  var TRASH_SECTION_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
  function addSectionDeleteButton(sectionEl) {
    if (sectionEl.querySelector(':scope > .phoxta-section-del-btn')) return;
    var btn = document.createElement('button');
    btn.className = 'phoxta-section-del-btn';
    btn.innerHTML = TRASH_SECTION_SVG + '<span>Delete section</span>';
    btn.title = 'Remove this entire section from the page';
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      // Confirm before deleting
      var msg = 'Delete this section? This cannot be undone.';
      if (!window.confirm(msg)) return;
      var sid = sectionEl.dataset.phoxtaSectionId || '';
      // Animate out
      sectionEl.style.transition = 'opacity 0.3s ease, max-height 0.4s ease';
      sectionEl.style.opacity = '0';
      sectionEl.style.overflow = 'hidden';
      sectionEl.style.maxHeight = sectionEl.offsetHeight + 'px';
      setTimeout(function() {
        sectionEl.style.maxHeight = '0';
        sectionEl.style.margin = '0';
        sectionEl.style.padding = '0';
      }, 60);
      setTimeout(function() {
        sectionEl.remove();
        // Clean up stored snapshot
        if (sid && sectionSnapshots[sid]) {
          delete sectionSnapshots[sid];
        }
        notifyChange();
      }, 450);
    });
    sectionEl.appendChild(btn);
  }

  // ---- Add a reset button to a section ----
  function addResetButton(sectionEl) {
    if (sectionEl.querySelector(':scope > .phoxta-reset-btn')) return;
    var pos = window.getComputedStyle(sectionEl).position;
    if (pos === 'static') sectionEl.style.position = 'relative';
    sectionEl.classList.add('phoxta-section-wrap');

    var btn = document.createElement('button');
    btn.className = 'phoxta-reset-btn';
    btn.innerHTML = RESET_SVG + '<span>Reset section</span>';
    btn.title = 'Restore this section to its original state';
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      resetSection(sectionEl);
    });
    sectionEl.appendChild(btn);
  }

  // ---- Add an AI generate button to a section ----
  function addAiGenerateButton(sectionEl) {
    if (sectionEl.querySelector(':scope > .phoxta-ai-btn')) return;

    var btn = document.createElement('button');
    btn.className = 'phoxta-ai-btn';
    btn.innerHTML = AI_SPARKLE_SVG + '<span>AI Write</span>';
    btn.title = 'Generate content for this section with Phoxta AI';

    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (btn.classList.contains('phoxta-ai-loading')) return;

      // Collect the text and icon content of this section (skip images)
      var sectionTexts = [];
      var sectionIcons = [];
      sectionEl.querySelectorAll('[data-phoxta-editable], h1, h2, h3, h4, h5, h6, p, li, blockquote, span').forEach(function(el) {
        if (el.closest('.phoxta-reset-btn, .phoxta-ai-btn, .phoxta-del-btn, .phoxta-drag-handle, .phoxta-link-btn, .phoxta-text-popup-backdrop, .phoxta-fmt-toolbar')) return;
        var text = el.innerText.trim();
        if (text && text.length > 1) {
          sectionTexts.push({ tag: el.tagName.toLowerCase(), text: text, key: el.dataset.phoxtaKey || '' });
        }
      });
      // Collect icon elements (i tags, svg icons with classes, icon fonts)
      sectionEl.querySelectorAll('i[class], .icon, [class*="icon"], svg').forEach(function(el) {
        if (el.closest('.phoxta-reset-btn, .phoxta-ai-btn, .phoxta-del-btn, .phoxta-drag-handle, .phoxta-img-toolbar, .phoxta-link-btn, .phoxta-fmt-toolbar')) return;
        var classes = el.getAttribute('class') || '';
        if (classes) sectionIcons.push(classes);
      });

      // Determine section name from class or tag
      var sectionName = 'section';
      var cls = (sectionEl.className || '').split(' ');
      for (var i = 0; i < cls.length; i++) {
        if (cls[i].indexOf('xeno') !== -1 || cls[i].indexOf('hero') !== -1 || cls[i].indexOf('about') !== -1 || cls[i].indexOf('service') !== -1 || cls[i].indexOf('project') !== -1 || cls[i].indexOf('testimonial') !== -1 || cls[i].indexOf('pricing') !== -1 || cls[i].indexOf('faq') !== -1 || cls[i].indexOf('cta') !== -1 || cls[i].indexOf('footer') !== -1 || cls[i].indexOf('counter') !== -1 || cls[i].indexOf('team') !== -1 || cls[i].indexOf('blog') !== -1 || cls[i].indexOf('contact') !== -1) {
          sectionName = cls[i];
          break;
        }
      }
      if (sectionName === 'section') sectionName = sectionEl.tagName.toLowerCase();

      // Show loading state
      btn.classList.add('phoxta-ai-loading');
      btn.innerHTML = '<span class="phoxta-ai-spinner"></span><span>Generating…</span>';

      var sid = sectionEl.dataset.phoxtaSectionId;
      window.parent.postMessage({
        type: 'phoxta-ai-generate',
        sectionId: sid,
        sectionName: sectionName,
        sectionTexts: sectionTexts,
        sectionIcons: sectionIcons,
      }, '*');
    });

    sectionEl.appendChild(btn);
  }

  // ---- Listen for AI-generated content from parent ----
  window.addEventListener('message', function(e) {
    if (!e.data || e.data.type !== 'phoxta-ai-content') return;
    var sid = e.data.sectionId;
    var contents = e.data.contents; // array of { key, text } or { iconClass }
    var error = e.data.error;

    // Find the section
    var sectionEl = document.querySelector('[data-phoxta-section-id="' + sid + '"]');
    if (!sectionEl) return;

    // Reset AI button
    var aiBtn = sectionEl.querySelector(':scope > .phoxta-ai-btn');
    if (aiBtn) {
      aiBtn.classList.remove('phoxta-ai-loading');
      aiBtn.innerHTML = AI_SPARKLE_SVG + '<span>AI Write</span>';
    }

    if (error) return; // parent will show a toast or similar

    if (!contents || !contents.length) return;

    // Apply each generated text to matching elements
    contents.forEach(function(item) {
      if (item.key && item.text) {
        // Find by data-phoxta-key
        var el = sectionEl.querySelector('[data-phoxta-key="' + item.key + '"]');
        if (el) {
          el.innerText = item.text;
          if (item.key) {
            window.parent.postMessage({ type: 'phoxta-edit', key: item.key, value: item.text }, '*');
          }
        }
      }
      if (item.iconClass && item.newIconClass) {
        // Replace icon classes
        var icons = sectionEl.querySelectorAll('.' + item.iconClass.split(' ').join('.'));
        icons.forEach(function(icon) {
          icon.className = item.newIconClass;
        });
      }
    });
    notifyChange();
  });

  // ---- Listen for AI-generated single-text content from parent ----
  window.addEventListener('message', function(e) {
    if (!e.data || e.data.type !== 'phoxta-ai-text-content') return;
    var key = e.data.key;
    var text = e.data.text;
    var error = e.data.error;
    var requestId = e.data.requestId || '';

    // Find the element by key
    var el = key ? document.querySelector('[data-phoxta-key="' + key + '"]') : null;

    // Reset inline sparkle button loading state
    if (el) {
      var inlineAiBtn = el.querySelector('.phoxta-text-ai-btn');
      if (inlineAiBtn) {
        inlineAiBtn.classList.remove('phoxta-ai-loading');
        inlineAiBtn.innerHTML = AI_SPARKLE_SVG;
      }
    }

    if (error || !text) return;

    if (el) {
      el.innerText = text;
      window.parent.postMessage({ type: 'phoxta-edit', key: key, value: text }, '*');
      notifyChange();
    }
  });

  // ================================================================
  // 1. Snapshot all sections BEFORE any editing modifications
  // ================================================================
  var sectionSelector = 'section, footer, header, nav';
  document.querySelectorAll(sectionSelector).forEach(function(sec) {
    if (sec.closest('.preloader')) return;
    var sid = 'sec_' + (sectionIdCounter++);
    sec.dataset.phoxtaSectionId = sid;
    sectionSnapshots[sid] = sec.innerHTML;  // pristine HTML
  });

  // ================================================================
  // 2. Set up editing on entire document
  // ================================================================
  setupEditingInContainer(document);

  // ================================================================
  // 3. Add reset buttons and layers panels to each section
  // ================================================================
  document.querySelectorAll(sectionSelector).forEach(function(sec) {
    if (sec.closest('.preloader')) return;
    addSectionDeleteButton(sec);
    addResetButton(sec);
    addAiGenerateButton(sec);
  });

  // ================================================================
  // 4. Listen for image replacement from parent
  // ================================================================
  window.addEventListener('message', function(e) {
    if (!e.data || e.data.type !== 'phoxta-replace-image') return;
    var targetKey = e.data.instanceKey;
    var newSrc = e.data.src;
    if (!targetKey || !newSrc) return;
    var targetImg = document.querySelector('[data-phoxta-img-instance="' + targetKey + '"]');
    if (!targetImg) return;

    // Check if this is a video replacement (prefixed with "video:")
    if (newSrc.indexOf('video:') === 0) {
      var videoUrl = newSrc.substring(6); // strip "video:" prefix
      var wrap = targetImg.closest('.phoxta-img-wrap');
      var container = wrap || targetImg.parentElement;
      if (!container) return;

      // Determine if it's a direct video file or an embed (YouTube/Vimeo)
      var isDirect = /\\.(mp4|webm|ogg)(\\?.*)?$/i.test(videoUrl);
      var videoEl;
      if (isDirect) {
        videoEl = document.createElement('video');
        videoEl.src = videoUrl;
        videoEl.setAttribute('controls', '');
        videoEl.setAttribute('playsinline', '');
        videoEl.style.width = '100%';
        videoEl.style.height = '100%';
        videoEl.style.objectFit = 'cover';
        videoEl.style.display = 'block';
      } else {
        videoEl = document.createElement('iframe');
        videoEl.src = videoUrl;
        videoEl.setAttribute('frameborder', '0');
        videoEl.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
        videoEl.setAttribute('allowfullscreen', '');
        videoEl.style.width = '100%';
        videoEl.style.height = '100%';
        videoEl.style.border = 'none';
        videoEl.style.display = 'block';
      }
      videoEl.setAttribute('data-phoxta-video', targetKey);
      videoEl.setAttribute('data-phoxta-img-instance', targetKey);

      // Replace the image with the video element
      if (wrap) {
        // Remove overlay and toolbar (editing UI) from the wrap
        var overlay = wrap.querySelector('.phoxta-img-overlay');
        var toolbar = wrap.querySelector('.phoxta-img-toolbar');
        if (overlay) overlay.remove();
        if (toolbar) toolbar.remove();
        // Remove the old img
        targetImg.remove();
        // Insert video
        wrap.insertBefore(videoEl, wrap.firstChild);
        // Ensure the wrap has aspect ratio for embeds
        if (!isDirect) {
          wrap.style.position = 'relative';
          wrap.style.paddingBottom = '56.25%';
          wrap.style.height = '0';
          wrap.style.overflow = 'hidden';
          videoEl.style.position = 'absolute';
          videoEl.style.top = '0';
          videoEl.style.left = '0';
        }
      } else {
        targetImg.replaceWith(videoEl);
      }
      notifyChange();
    } else {
      // Normal image replacement
      targetImg.style.objectFit = 'cover';
      targetImg.setAttribute('src', newSrc);
      targetImg.src = newSrc;
      // Remove stale inline width/height so CSS responsive rules take effect
      targetImg.style.removeProperty('width');
      targetImg.style.removeProperty('height');
      notifyChange();
    }
  });
  // ================================================================
  // 5. Broadcast element selection to parent (for properties panel)
  // ================================================================
  document.addEventListener('click', function(e) {
    var el = e.target;
    // Walk up to find the nearest editable or image element
    var editable = el.closest ? el.closest('[data-phoxta-editable]') : null;
    var imgWrap = el.closest ? el.closest('.phoxta-img-wrap') : null;
    var link = el.closest ? el.closest('a[data-phoxta-link]') : null;

    // Skip if clicking on UI chrome
    if (el.closest && el.closest('.phoxta-reset-btn, .phoxta-section-del-btn, .phoxta-ai-btn, .phoxta-text-popup-backdrop, .phoxta-link-popover, .phoxta-fmt-toolbar')) return;

    if (editable) {
      var cs = window.getComputedStyle(editable);
      window.parent.postMessage({
        type: 'phoxta-element-selected',
        elementType: 'text',
        key: editable.dataset.phoxtaKey || '',
        tag: editable.tagName.toLowerCase(),
        text: editable.innerText.trim(),
        styles: {
          fontFamily: cs.fontFamily,
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          fontStyle: cs.fontStyle,
          textDecoration: cs.textDecoration,
          textAlign: cs.textAlign,
          lineHeight: cs.lineHeight,
          letterSpacing: cs.letterSpacing,
          color: cs.color,
        },
      }, '*');
    } else if (imgWrap) {
      var img = imgWrap.querySelector('img');
      if (img) {
        window.parent.postMessage({
          type: 'phoxta-element-selected',
          elementType: 'image',
          key: img.dataset.phoxtaImgInstance || '',
          tag: 'img',
          src: img.src,
          alt: img.getAttribute('alt') || '',
          width: img.dataset.phoxtaWidth || '',
          height: img.dataset.phoxtaHeight || '',
        }, '*');
      }
    } else if (link) {
      var cs2 = window.getComputedStyle(link);
      window.parent.postMessage({
        type: 'phoxta-element-selected',
        elementType: 'link',
        key: link.dataset.phoxtaLink || '',
        tag: 'a',
        text: link.innerText.trim(),
        href: link.getAttribute('href') || '',
        styles: {
          fontFamily: cs2.fontFamily,
          fontSize: cs2.fontSize,
          fontWeight: cs2.fontWeight,
          color: cs2.color,
        },
      }, '*');
    } else {
      // Deselect
      window.parent.postMessage({ type: 'phoxta-element-selected', elementType: null }, '*');
    }
  }, true);

  // ================================================================
  // 6. Listen for layer-action messages from parent
  // ================================================================
  window.addEventListener('message', function(e) {
    if (!e.data || e.data.type !== 'phoxta-layer-action') return;
    var action = e.data.action; // 'click' | 'highlight'
    var key = e.data.key;
    var itemType = e.data.itemType; // 'text' | 'image' | 'link'
    if (!key) return;

    var el = null;
    if (itemType === 'image') {
      el = document.querySelector('[data-phoxta-img-instance="' + key + '"]');
    } else if (itemType === 'link') {
      el = document.querySelector('[data-phoxta-link-id="' + key + '"]');
    } else {
      el = document.querySelector('[data-phoxta-key="' + key + '"]');
    }
    if (!el) return;

    // Highlight
    el.classList.remove('phoxta-highlight');
    void el.offsetWidth;
    el.classList.add('phoxta-highlight');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    if (action === 'click') {
      if (itemType === 'text') {
        showTextEditPopup(el);
      } else if (itemType === 'image') {
        var wrap = el.closest('.phoxta-img-wrap');
        if (wrap) wrap.click();
      } else if (itemType === 'link') {
        showLinkPopover(el);
      }
    }
  });

  // ================================================================
  // 7. Signal parent that iframe is ready to receive saved images
  // ================================================================
  window.parent.postMessage({ type: 'phoxta-iframe-ready' }, '*');
  // Also broadcast initial layers tree
  setTimeout(broadcastLayers, 100);
});
</script>
`

/**
 * Injects the inline-editing script right before </body> in the raw HTML.
 */
function injectEditingScript(html: string): string {
  const bodyClose = html.lastIndexOf('</body>')
  if (bodyClose === -1) return html + EDITING_SCRIPT
  return html.slice(0, bodyClose) + EDITING_SCRIPT + html.slice(bodyClose)
}

/**
 * Renders a Xeno HTML template variant inside an iframe.
 * All text elements (data-phoxta) are contenteditable & deletable.
 * All images (data-phoxta-image) are clickable to swap & deletable.
 * Each image instance is uniquely tracked so duplicates are independent.
 * Replaced images are resized to the exact placeholder dimensions.
 */
function XenoPreviewBase({ variant, ...props }: TemplateProps & { variant: XenoVariant }) {
  const {
    setLandingData,
    generatedImages,
    approvedSections,
    businessInfo,
    saveDay10State,
    editedHtml: savedEditedHtml,
    onEditedHtmlChange,
    ideaId,
  } = props

  const { folder, emoji } = XENO_VARIANTS[variant]
  const [rawHtml, setRawHtml] = useState<string | null>(null)
  const [loading, setLoading] = useState(!savedEditedHtml)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Track which image instance was clicked (for sending replacement back)
  const pendingImageRef = useRef<{
    instanceKey: string
    placeholderWidth: number
    placeholderHeight: number
  } | null>(null)

  // Fetch the raw template HTML once (cache-bust to avoid stale browser cache)
  useEffect(() => {
    fetch(`${folder}index.html?v=${Date.now()}`)
      .then((r) => r.text())
      .then((html) => {
        setRawHtml(html)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [folder, variant])

  // Compute the iframe srcDoc — from saved HTML or freshly-fetched template.
  const [stableSrcDoc, setStableSrcDoc] = useState<string>('')

  useEffect(() => {
    const html = savedEditedHtml || rawHtml
    if (!html) return
    setStableSrcDoc(injectEditingScript(html))
  }, [savedEditedHtml, rawHtml, variant])

  // Listen for postMessage from the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return

      // ---- Text edit ----
      if (event.data.type === 'phoxta-edit') {
        const key = event.data.key as string
        const value = event.data.value as string
        if (key && value !== undefined) {
          setLandingData((prev) => {
            const next = { ...prev }
            const parts = key.split('_')

            if (parts.length === 1) {
              next[key] = value
            } else if (parts.length === 2) {
              next[key] = value
            } else if (parts.length >= 3) {
              const arrayKey = parts[0]
              const idx = parseInt(parts[1], 10)
              const field = parts.slice(2).join('_')
              if (!isNaN(idx) && Array.isArray(next[arrayKey])) {
                const arr = [...(next[arrayKey] as Record<string, unknown>[])]
                if (arr[idx]) {
                  arr[idx] = { ...arr[idx], [field]: value }
                  next[arrayKey] = arr
                }
              } else {
                next[key] = value
              }
            }

            saveDay10State(next, generatedImages, approvedSections, businessInfo)
            return next
          })
        }
      }

      // ---- Delete element ----
      if (event.data.type === 'phoxta-delete') {
        const key = event.data.key as string
        const elType = event.data.elementType as string
        if (!key) return

        if (elType === 'image') {
          // Remove from generatedImages if stored
          // The instanceKey format is baseKey__inst_N — extract baseKey
          const baseKey = key.split('__inst_')[0]
          if (baseKey && generatedImages[baseKey]) {
            const nextImages = { ...generatedImages }
            delete nextImages[baseKey]
            saveDay10State(undefined as unknown as Record<string, unknown>, nextImages, approvedSections, businessInfo)
          }
        } else {
          // Text: remove from landingData
          setLandingData((prev) => {
            const next = { ...prev }
            const parts = key.split('_')
            if (parts.length >= 3) {
              const arrayKey = parts[0]
              const idx = parseInt(parts[1], 10)
              const field = parts.slice(2).join('_')
              if (!isNaN(idx) && Array.isArray(next[arrayKey])) {
                const arr = [...(next[arrayKey] as Record<string, unknown>[])]
                if (arr[idx]) {
                  arr[idx] = { ...arr[idx], [field]: '' }
                  next[arrayKey] = arr
                }
              } else {
                next[key] = ''
              }
            } else {
              next[key] = ''
            }
            saveDay10State(next, generatedImages, approvedSections, businessInfo)
            return next
          })
        }
      }

      // ---- Image click (open asset library) ----
      if (event.data.type === 'phoxta-image-click') {
        const imageKey = event.data.imageKey as string
        const pw = event.data.placeholderWidth as number
        const ph = event.data.placeholderHeight as number
        if (imageKey) {
          pendingImageRef.current = {
            instanceKey: imageKey,
            placeholderWidth: pw || 400,
            placeholderHeight: ph || 300,
          }
          window.dispatchEvent(
            new CustomEvent('phoxta-open-asset-library', {
              detail: {
                section: imageKey,
                placeholderWidth: pw || 400,
                placeholderHeight: ph || 300,
              },
            }),
          )
        }
      }

      // ---- Link edit ----
      if (event.data.type === 'phoxta-link-edit') {
        const key = event.data.key as string
        const href = event.data.href as string
        if (key && href) {
          setLandingData((prev) => {
            const next = { ...prev }
            // Store link data under a links map
            const links = { ...(next._links as Record<string, string> || {}) }
            links[key] = href
            next._links = links
            saveDay10State(next, generatedImages, approvedSections, businessInfo)
            return next
          })
        }
      }

      // ---- HTML snapshot (full edited template) ----
      if (event.data.type === 'phoxta-html-snapshot') {
        const html = event.data.html as string
        if (html && onEditedHtmlChange) {
          onEditedHtmlChange(html)
        }
      }

      // ---- AI generate section content ----
      if (event.data.type === 'phoxta-ai-generate') {
        const sectionId = event.data.sectionId as string
        const sectionName = event.data.sectionName as string
        const sectionTexts = event.data.sectionTexts as { tag: string; text: string; key: string }[]
        const sectionIcons = event.data.sectionIcons as string[]
        if (!ideaId || !sectionId) return

        // Call the AI section generation API
        ;(async () => {
          try {
            const res = await fetch(`/api/idea/${ideaId}/generate-section-content`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sectionName,
                sectionTexts,
                sectionIcons,
                businessInfo,
              }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'AI generation failed')

            // Send generated content back to iframe
            const iframe = iframeRef.current
            if (iframe?.contentWindow) {
              iframe.contentWindow.postMessage({
                type: 'phoxta-ai-content',
                sectionId,
                contents: data.contents || [],
              }, '*')
            }
          } catch {
            // Send error back to iframe to reset loading state
            const iframe = iframeRef.current
            if (iframe?.contentWindow) {
              iframe.contentWindow.postMessage({
                type: 'phoxta-ai-content',
                sectionId,
                error: true,
                contents: [],
              }, '*')
            }
          }
        })()
      }

      // ---- AI generate single text content ----
      if (event.data.type === 'phoxta-ai-text-generate') {
        const key = event.data.key as string
        const tag = event.data.tag as string
        const text = event.data.text as string
        const requestId = (event.data.requestId || '') as string
        if (!ideaId || !key) return

        ;(async () => {
          try {
            const res = await fetch(`/api/idea/${ideaId}/generate-section-content`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sectionName: 'Single element',
                sectionTexts: [{ tag, text, key }],
                sectionIcons: [],
                businessInfo,
              }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'AI generation failed')

            const contents = data.contents || []
            const generatedText = contents.length > 0 ? contents[0].text : ''

            const iframe = iframeRef.current
            if (iframe?.contentWindow) {
              iframe.contentWindow.postMessage({
                type: 'phoxta-ai-text-content',
                key,
                text: generatedText,
                requestId,
              }, '*')
            }
          } catch {
            const iframe = iframeRef.current
            if (iframe?.contentWindow) {
              iframe.contentWindow.postMessage({
                type: 'phoxta-ai-text-content',
                key,
                error: true,
                text: '',
                requestId,
              }, '*')
            }
          }
        })()
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [setLandingData, saveDay10State, generatedImages, approvedSections, businessInfo, ideaId, onEditedHtmlChange])

  // When iframe signals ready, push all saved images back into it
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'phoxta-iframe-ready') {
        const iframe = iframeRef.current
        if (!iframe?.contentWindow) return
        // Re-apply every saved image replacement
        for (const [key, url] of Object.entries(generatedImages)) {
          if (url) {
            iframe.contentWindow.postMessage(
              { type: 'phoxta-replace-image', instanceKey: key, src: url },
              '*',
            )
          }
        }
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [generatedImages])

  // Listen for image selection from AssetLibraryModal and push into iframe
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (!detail?.url || !pendingImageRef.current) return
      const { instanceKey } = pendingImageRef.current

      // Post replacement into iframe
      const iframe = iframeRef.current
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(
          { type: 'phoxta-replace-image', instanceKey, src: detail.url },
          '*',
        )
      }

      pendingImageRef.current = null
    }
    window.addEventListener('phoxta-image-replaced', handler)
    return () => window.removeEventListener('phoxta-image-replaced', handler)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center animate-pulse">
            <span className="text-2xl">{emoji}</span>
          </div>
          <p className="text-sm text-muted-foreground">Loading template…</p>
        </div>
      </div>
    )
  }

  if (!rawHtml && !savedEditedHtml && !stableSrcDoc) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50">
        <p className="text-sm text-red-500">Failed to load template.</p>
      </div>
    )
  }

  return (
    <iframe
      ref={iframeRef}
      srcDoc={stableSrcDoc}
      className="w-full border-0"
      style={{ minHeight: '100vh', height: '100%' }}
      sandbox="allow-scripts allow-same-origin"
      title="Landing Page Preview"
    />
  )
}

// ---------------------------------------------------------------------------
// Exported variant wrappers (one per xeno template variant)
// ---------------------------------------------------------------------------
export function XenoTemplatePreview(p: TemplateProps) { return <XenoPreviewBase variant="xeno" {...p} /> }
export function XenoAiPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoAi" {...p} /> }
export function XenoDsPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoDs" {...p} /> }
export function XenoMaPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoMa" {...p} /> }
export function XenoWaPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoWa" {...p} /> }
export function XenoMinPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoMin" {...p} /> }
export function XenoSuPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoSu" {...p} /> }
export function XenoPfPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoPf" {...p} /> }
export function XenoCoPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoCo" {...p} /> }
export function XenoRePreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoRe" {...p} /> }
export function XenoInfPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoInf" {...p} /> }
export function XenoLawPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoLaw" {...p} /> }
export function XenoFitPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoFit" {...p} /> }
export function XenoEduPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoEdu" {...p} /> }
export function XenoMedPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoMed" {...p} /> }
export function XenoEvPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoEv" {...p} /> }
export function XenoRlPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoRl" {...p} /> }
export function XenoPhPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoPh" {...p} /> }
export function XenoTraPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoTra" {...p} /> }
export function XenoEcoPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoEco" {...p} /> }
export function XenoMusPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoMus" {...p} /> }
export function XenoBarPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoBar" {...p} /> }
export function XenoCafePreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoCafe" {...p} /> }
export function XenoPetPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoPet" {...p} /> }
export function XenoArcPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoArc" {...p} /> }
export function XenoYogPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoYog" {...p} /> }
export function XenoAutPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoAut" {...p} /> }
export function XenoDenPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoDen" {...p} /> }
export function XenoFloPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoFlo" {...p} /> }
export function XenoBakPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoBak" {...p} /> }
export function XenoSpaPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoSpa" {...p} /> }
export function XenoNgoPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoNgo" {...p} /> }
export function XenoPodPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoPod" {...p} /> }
export function XenoCryPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoCry" {...p} /> }
export function XenoFasPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoFas" {...p} /> }
export function XenoIntPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoInt" {...p} /> }
export function XenoDjPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoDj" {...p} /> }
export function XenoAccPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoAcc" {...p} /> }
export function XenoPlmPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoPlm" {...p} /> }
export function XenoDayPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoDay" {...p} /> }
export function XenoChuPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoChu" {...p} /> }
export function XenoInsPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoIns" {...p} /> }
export function XenoVetPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoVet" {...p} /> }
export function XenoPhrPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoPhr" {...p} /> }
export function XenoLogPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoLog" {...p} /> }
export function XenoAgrPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoAgr" {...p} /> }
export function XenoWnePreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoWne" {...p} /> }
export function XenoBrwPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoBrw" {...p} /> }
export function XenoTatPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoTat" {...p} /> }
export function XenoClnPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoCln" {...p} /> }
export function XenoSecPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoSec" {...p} /> }
export function XenoMovPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoMov" {...p} /> }
export function XenoWedPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoWed" {...p} /> }
export function XenoHtlPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoHtl" {...p} /> }
export function XenoGolPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoGol" {...p} /> }
export function XenoMarPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoMar" {...p} /> }
export function XenoDncPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoDnc" {...p} /> }
export function XenoThrPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoThr" {...p} /> }
export function XenoMsmPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoMsm" {...p} /> }
export function XenoRecPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoRec" {...p} /> }
export function XenoBldPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoBld" {...p} /> }
export function XenoSolPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoSol" {...p} /> }
export function XenoJwlPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoJwl" {...p} /> }
export function XenoOptPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoOpt" {...p} /> }
export function XenoChiPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoChi" {...p} /> }
export function XenoPsyPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoPsy" {...p} /> }
export function XenoNutPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoNut" {...p} /> }
export function XenoCokPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoCok" {...p} /> }
export function XenoLndPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoLnd" {...p} /> }
export function XenoPrnPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoPrn" {...p} /> }
export function XenoCwhPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoCwh" {...p} /> }
export function XenoLauPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoLau" {...p} /> }
export function XenoNrsPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoNrs" {...p} /> }
export function XenoGrcPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoGrc" {...p} /> }
export function XenoBksPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoBks" {...p} /> }
export function XenoGamPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoGam" {...p} /> }
export function XenoSptPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoSpt" {...p} /> }
export function XenoCamPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoCam" {...p} /> }
export function XenoDivPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoDiv" {...p} /> }
export function XenoBnkPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoBnk" {...p} /> }
export function XenoAptPreview(p: TemplateProps) { return <XenoPreviewBase variant="xenoApt" {...p} /> }
