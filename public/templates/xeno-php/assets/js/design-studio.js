/*-----------------------------------------------------------------------------------
    
    Template Name: Xeno - Multipurpose Startup Agency PHP Template
    
    Description: Xeno is a sleek and modern HTML template designed specifically for startups, tech companies, SaaS platforms, digital agencies, and entrepreneurs. Built with Bootstrap 5, GSAP animations, and clean semantic code, Zeno is your perfect front-end foundation for building stunning, high-converting websites with ease. 
    
    Version: 1.0 

-----------------------------------------------------------------------------------

    
-----------------------------------------------------------------------------------*/

(function($) {
    'use strict';


    // Gsap Pin Spaceer


    $(function () {
        var width = $(window).width();
        if (width > 768) { 
            "use strict";
            gsap.utils.toArray('.fp-fun').forEach(container => {
                const img = container.querySelector('.xeno-fun-item');
                const tl = gsap.timeline({
                  scrollTrigger: {
                    trigger: container,
                    scrub: true,
                    pin: false,
                  }
                });
                tl.fromTo(img, {
                  yPercent: 0,
                  ease: 'none'
                }, {
                  yPercent: 40,
                  ease: 'none'
                });
            });
        }
    });

    $(function () {
        var width = $(window).width();
        if (width > 991) { 
            "use strict";
            $(function () {
                let cards = gsap.utils.toArray(".xeno-project-list .xeno-project-item");
                let stickDistance = 100; 
                let lastCardST = ScrollTrigger.create({
                    trigger: cards[cards.length - 1],
                    start: "bottom bottom",
                    markers: false 
                });
    
                cards.forEach((card, index) => {
                    ScrollTrigger.create({
                        trigger: card,
                        start: "top top", 
                        end: () => lastCardST.start + stickDistance, 
                        pin: true,      
                        pinSpacing: false, 
                        ease: "none",    
                        scrub: true,     
                        toggleActions: "reverse none none reverse",
                        markers: false 
                    });
                });
            });
        }
    });

    //===== Slick slider js

    if ($('.testimonial-slider').length) {
        $('.testimonial-slider').slick({
            dots: false,
            arrows: false,
            infinite: true,
            speed: 800,
            autoplay: true,
            slidesToShow: 3,
            slidesToScroll: 1,
            prevArrow: '<div class="prev"><i class="far fa-angle-left"></i></div>',
            nextArrow: '<div class="next"><i class="far fa-angle-right"></i></div>',
            responsive: [
                {
                    breakpoint: 1200,
                    settings: {
                        slidesToShow: 2
                    }
                },
                {
                    breakpoint: 767,
                    settings: {
                        slidesToShow: 1
                    }
                }
            ]
        });
    }

    if ($('.process-slider').length) {
        $('.process-slider').slick({
            speed: 8000,
            autoplay: true,
            autoplaySpeed: 0,
            centerMode: false,
            cssEase: 'linear',
            slidesToShow: 1,
            draggable:false,
            focusOnSelect:false,
            pauseOnFocus:false,
            pauseOnHover:false,
            slidesToScroll: 1,
            variableWidth: true,
            infinite: true,
            initialSlide: 1,
            arrows: false,
            breakpoints: {
                992: {
                    slidesPerView: 4,
                },
                768: {
                    slidesPerView: 3,
                },
                576: {
                    slidesPerView: 2,
                },
            },
        });
    }

    if ($('.company-slider').length) {
        $('.company-slider').slick({
            dots: false,
            arrows: false,
            infinite: true,
            speed: 6000,
            autoplay: true,
            autoplaySpeed: 0,
            cssEase: 'linear',
            slidesToShow: 6,
            slidesToScroll: 1,
            prevArrow: '<div class="prev"><i class="far fa-arrow-left"></i></div>',
            nextArrow: '<div class="next"><i class="far fa-arrow-right"></i></div>',
            responsive: [
                {
                    breakpoint: 1400,
                    settings: {
                        slidesToShow: 6,
                    }
                },
                {
                    breakpoint: 1200,
                    settings: {
                        slidesToShow: 4,
                    }
                },
                {
                    breakpoint: 767,
                    settings: {
                        slidesToShow: 2
                    }
                }
            ]
        });
    }


})(window.jQuery);