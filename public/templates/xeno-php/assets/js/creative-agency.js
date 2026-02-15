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
        if (width > 991) { 
            "use strict";
            $(function () {
                let cards = gsap.utils.toArray(".ca-testimonial-box");
                cards.forEach((card) => {
                    ScrollTrigger.create({
                        trigger: card,                
                        start: "top top",
                        end: "bottom top",
                        pin: true,
                        pinSpacing: true,
                        scrub: true,
                        markers: false,
                        toggleActions: "none none none none"
                    });
                });
            });
        }
    });

    $(function () {
        var width = $(window).width();
        if (width > 768) { 
            "use strict";
            $(function () {
                let cards = gsap.utils.toArray(".ca-testimonial-list .xeno-testimonial-item");
                let stickDistance = 500; 
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

    // ===== Accordion Class Toggle
        
    $('.accordion .service-header').on('click', function (event) {
        event.preventDefault();
        var $parent = $(this).parent();
        if ($parent.hasClass('service-active')) {
            $parent.removeClass('service-active');
        } else {
            $('.accordion .xeno-service-item').removeClass('service-active');
            $parent.addClass('service-active');
        }
    });

    // Zeno Award Item

    const elements = $('.xeno-award-item');
    setTimeout(() => {
        elements.each(function() {
            const element = $(this);
            const image = element.find('.hover-image');  // Get the hover-image for each element

            element.mouseenter(function() {
                gsap.to(image, {delay: 0, duration: 0, autoAlpha: 1});
            });

            element.mouseleave(function() {
                gsap.to(image, {delay: 0, duration: 0, autoAlpha: 0});
            });

            element.mousemove(function(e) {
                const contentBox = element[0].getBoundingClientRect();
                const dx = e.clientX - contentBox.x;
                const dy = e.clientY - contentBox.y;

                gsap.set(image, {delay: 0, duration: 0, x: dx, y: dy});
            });
        });
    }, 100);

    // ===== Slick Slider

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