/*-----------------------------------------------------------------------------------
    
    Template Name: Xeno - Multipurpose Startup Agency PHP Template
    
    Description: Xeno is a sleek and modern HTML template designed specifically for startups, tech companies, SaaS platforms, digital agencies, and entrepreneurs. Built with Bootstrap 5, GSAP animations, and clean semantic code, Zeno is your perfect front-end foundation for building stunning, high-converting websites with ease. 
    
    Version: 1.0 

    Note: This is Main Js file

-----------------------------------------------------------------------------------
    ===================
    Js INDEX
    ===================
    ## Main Menu
    ## Document Ready
    ## Nav Overlay
    ## Preloader
    ## Sticky
    ## Back to top
    ## Magnific-popup js
    ## AOS Js
    ## GSAP
    
-----------------------------------------------------------------------------------*/

(function($) {
	'use strict';

	//===== Main Menu

	function mainMenu() {

		var var_window = $(window),
			navContainer = $('.header-navigation'),
			navbarToggler = $('.navbar-toggler'),
			navMenu = $('.xeno-nav-menu'),
			navMenuLi = $('.xeno-nav-menu ul li ul li'),
			closeIcon = $('.navbar-close');
		navbarToggler.on('click', function() {
			navbarToggler.toggleClass('active');
			navMenu.toggleClass('menu-on');
		});
		closeIcon.on('click', function() {
			navMenu.removeClass('menu-on');
			navbarToggler.removeClass('active');
		});
		navMenu.find("li a").each(function() {
			if ($(this).children('.dd-trigger').length < 1) {
				if ($(this).next().length > 0) {
					$(this).append('<span class="dd-trigger"><i class="far fa-angle-down"></i></span>')
				}
			}
		});
		navMenu.on('click', '.dd-trigger', function(e) {
			e.preventDefault();
			$(this).parent().parent().siblings().children('ul.sub-menu').slideUp();
			$(this).parent().next('ul.sub-menu').stop(true, true).slideToggle(350);
			$(this).toggleClass('sub-menu-open');
		});

	};

	//===== Offcanvas Overlay

	function offCanvas() {
		const $overlay = $(".offcanvas__overlay");
		const $toggler = $(".navbar-toggler");
		const $menu = $(".xeno-nav-menu");
		$toggler.add($overlay).add(".navbar-close, .panel-close-btn").on("click", function() {
			$overlay.toggleClass("overlay-open");
			if ($(this).is($overlay)) {
				$toggler.removeClass("active");
				$menu.removeClass("menu-on");
			}
		});
		$(window).on("resize", function() {
			if ($(window).width() > 991) $overlay.removeClass("overlay-open");
		});
	}

	//===== Windows load

	$(window).on('load', function(event) {
		//===== Preloader
		$('.preloader').delay(500).fadeOut(500);
	})

	//===== Sticky

	$(document).ready(function () {
        function initStickyHeader(headerSelector) {
            const header = $(headerSelector);
            let lastScroll = 0;
    
            $(window).on('scroll', function () {
                const currentScroll = $(this).scrollTop();
                if (currentScroll > 200) {
                    if (currentScroll < lastScroll) {
                        if (!header.hasClass('sticky')) {
                            header.addClass('sticky');
                        }
                    } else {
                        header.removeClass('sticky');
                    }
                } else if (currentScroll === 0) {
                    header.removeClass('sticky');
                }
                lastScroll = currentScroll;
            });
        }
        initStickyHeader('.header-area');
    });


	//===== Magnific-popup js

	if ($('.video-popup').length) {
		$('.video-popup').magnificPopup({
			type: 'iframe',
			removalDelay: 300,
			mainClass: 'mfp-fade'
		});
	}
	if ($('.play-btn').length) {
		$('.play-btn').magnificPopup({
			type: 'iframe',
			removalDelay: 300,
			mainClass: 'mfp-fade'
		});
	}
	// ===== Counter

	if ($('.counter').length) {
		const observer = new IntersectionObserver((entries, observer) => {
			entries.forEach(entry => {
				if (entry.isIntersecting) {
					$(entry.target).counterUp({
						delay: 100,
						time: 4000
					});
					observer.unobserve(entry.target);
				}
			});
		}, {
			threshold: 1.0
		});
		$('.counter').each(function() {
			observer.observe(this);
		});
	}

  	//====== Aos 

	AOS.init({
		offset: 0
	});

	//===== Gasp Registration

	gsap.registerPlugin(SplitText, ScrollTrigger, ScrollSmoother);

	// Gsap ScrollSmoother

	if (window.innerWidth > 991) {
		ScrollSmoother.create({
		  smooth: 1,
		  effects: true
		});
	}

	// Gsap Text Animation

	if ($('.split').length > 0) {
		let mySplitText = new SplitText(".split", {
			type: "chars"
		});
		let chars = mySplitText.chars;
		gsap.from(chars, {
			yPercent: 100,
			stagger: 0.065,
			ease: "back.out",
			duration: 1,
			scrollTrigger: {
				trigger: ".split",
				start: "top 50%",
			}
		});
	}

	if ($('.text-anm').length) {
		let staggerAmount = 0.01,
			translateXValue = 40,
			delayValue = .5,
			easeType = "power2.out",
			animatedTextElements = document.querySelectorAll('.text-anm');
		animatedTextElements.forEach((element) => {
			let animationSplitText = new SplitText(element, {
				type: "chars, words"
			});
			gsap.from(animationSplitText.chars, {
				duration: 1,
				delay: delayValue,
				x: translateXValue,
				autoAlpha: 0,
				stagger: staggerAmount,
				ease: easeType,
				scrollTrigger: {
					trigger: element,
					start: "top 85%"
				},
			});
		});
	}

	if ($('.text-anm-two').length) {
		const $container = $(".text-anm-two");
		const text = $container.text();
		const characters = text.split("");
		$container.empty();
		characters.forEach(char => {
			$container.append(`<span class='char'>${char}</span>`);
		});
		const $chars = $container.find(".char");
		gsap.timeline({
				repeat: -1
			})
			.from($chars, {
				y: 50,
				opacity: 0,
				ease: "elastic.out(.5, 0.5)",
				stagger: 0.08,
				duration: 0.5,
			})
	}


	if ($('.text-anm-three').length) {
		let staggerAmount = 0.01,
			translateXValue = 40,
			delayValue = .3,
			easeType = "power2.out",
			animatedTextElements = document.querySelectorAll('.text-anm-three');
		animatedTextElements.forEach((element) => {
			let animationSplitText = new SplitText(element, {
				type: "chars, words"
			});
			gsap.from(animationSplitText.chars, {
				duration: 1,
				delay: delayValue,
				x: translateXValue,
				autoAlpha: 0,
				stagger: staggerAmount,
				ease: easeType,
				scrollTrigger: {
					trigger: element,
					start: "top 85%"
				},
			});
		});
	}


	if ($('#animated-text').length) {
		var $quote = $("#animated-text");
		var mySplitText = new SplitText($quote, {
			type: "chars"
		});
		var splitTextTimeline = gsap.timeline({
			scrollTrigger: {
				trigger: $quote,
				start: "top 80%",
				toggleActions: "play none none none"
			}
		});
		gsap.set($quote, {
			perspective: 400
		});
		splitTextTimeline.from(mySplitText.chars, {
			duration: 1,
			scale: 4,
			autoAlpha: 0,
			rotationX: -180,
			transformOrigin: "100% 50%",
			ease: "back.out(1.7)",
			stagger: 0.02
		});
	}

	// Gsap Parallax

	gsap.utils.toArray('.pl-one').forEach(container => {
		const img = container.querySelector('img,span');
		const tl = gsap.timeline({
			scrollTrigger: {
				trigger: container,
				scrub: true,
				pin: false, // set to true if you want to pin the container during animation
			}
		});
		tl.fromTo(img, {
			yPercent: -20,
			ease: 'none'
		}, {
			yPercent: 20,
			ease: 'none'
		});
	});

	gsap.utils.toArray('.pl-two').forEach(container => {
		const img = container.querySelector('img,span');
		const tl = gsap.timeline({
			scrollTrigger: {
				trigger: container,
				scrub: true,
				pin: false,
			}
		});
		tl.fromTo(img, {
			yPercent: 20,
			ease: 'none'
		}, {
			yPercent: -20,
			ease: 'none'
		});
	});

	gsap.utils.toArray('.cl-one').forEach(container => {
		const img = container.querySelector('span');
		const tl = gsap.timeline({
			scrollTrigger: {
				trigger: container,
				scrub: true,
				pin: false,
			}
		});
		tl.fromTo(img, {
			yPercent: 80,
			ease: 'none'
		}, {
			yPercent: -20,
			ease: 'none'
		});
	});

	gsap.utils.toArray('.cl-two').forEach(container => {
		const img = container.querySelector('span');
		const tl = gsap.timeline({
			scrollTrigger: {
				trigger: container,
				scrub: true,
				pin: false,
			}
		});
		tl.fromTo(img, {
			yPercent: -120,
			ease: 'none'
		}, {
			yPercent: 20,
			ease: 'none'
		});
	});

	// Document Ready

	$(function() {
		mainMenu();
		offCanvas();
	});

})(window.jQuery);