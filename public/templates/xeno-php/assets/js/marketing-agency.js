/*-----------------------------------------------------------------------------------
    
    Template Name: Xeno - Multipurpose Startup Agency PHP Template
    
    Description: Xeno is a sleek and modern HTML template designed specifically for startups, tech companies, SaaS platforms, digital agencies, and entrepreneurs. Built with Bootstrap 5, GSAP animations, and clean semantic code, Zeno is your perfect front-end foundation for building stunning, high-converting websites with ease. 
    
    Version: 1.0 

-----------------------------------------------------------------------------------

    
-----------------------------------------------------------------------------------*/

(function($) {
    'use strict';


    // ===== Accordion Class Toggle
        
    
    $('.accordion .accordion-header').on('click', function (event) {
        event.preventDefault();
        var $parent = $(this).parent();
        if ($parent.hasClass('accordion-active')) {
            $parent.removeClass('accordion-active');
        } else {
            $('.accordion .xeno-accordion-item').removeClass('accordion-active');
            $parent.addClass('accordion-active');
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
            slidesToShow: 1,
            slidesToScroll: 1,
        });
    }

    if ($('.project-slider').length) {
        $('.project-slider').slick({
            dots: false,
            arrows: false,
            infinite: true,
            speed: 6000,
            autoplay: false,
            autoplaySpeed: 0,
            cssEase: 'linear',
            slidesToShow: 4,
            slidesToScroll: 1,
            prevArrow: '<div class="prev"><i class="far fa-arrow-left"></i></div>',
            nextArrow: '<div class="next"><i class="far fa-arrow-right"></i></div>',
            responsive: [
                {
                    breakpoint: 1400,
                    settings: {
                        slidesToShow: 3,
                    }
                },
                {
                    breakpoint: 1200,
                    settings: {
                        slidesToShow: 2,
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

    if ($('.client-slider').length) {
        $('.client-slider').slick({
            dots: false,
            arrows: false,
            infinite: true,
            speed: 6000,
            autoplay: true,
            autoplaySpeed: 0,
            cssEase: 'linear',
            slidesToShow: 5,
            slidesToScroll: 1,
            prevArrow: '<div class="prev"><i class="far fa-arrow-left"></i></div>',
            nextArrow: '<div class="next"><i class="far fa-arrow-right"></i></div>',
            responsive: [
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