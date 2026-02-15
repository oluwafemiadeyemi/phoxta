/*-----------------------------------------------------------------------------------
    
    Template Name: Xeno - Multipurpose Startup Agency PHP Template
    
    Description: Xeno is a sleek and modern HTML template designed specifically for startups, tech companies, SaaS platforms, digital agencies, and entrepreneurs. Built with Bootstrap 5, GSAP animations, and clean semantic code, Zeno is your perfect front-end foundation for building stunning, high-converting websites with ease. 
    
    Version: 1.0 

-----------------------------------------------------------------------------------*/

(function($) {
    'use strict';

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
            prevArrow: '<div class="prev"><i class="far fa-angle-left"></i></div>',
            nextArrow: '<div class="next"><i class="far fa-angle-right"></i></div>'
        });
    }


    $(function () {
        var width = $(window).width();
        if (width > 1200) { 
            gsap.utils.toArray('.pl-three').forEach(container => {
                const img = container.querySelector('img,span');
                const tl = gsap.timeline({
                  scrollTrigger: {
                    trigger: container,
                    scrub: true,
                    pin: false, // set to true if you want to pin the container during animation
                  }
                });
                tl.fromTo(img, {
                  yPercent: 70,
                  ease: 'none'
                }, {
                  yPercent: 20,
                  ease: 'none'
                });
            });
        }
    });

    $(function () {
        var width = $(window).width();
        if (width > 1200) { 
            "use strict";
            if (document.querySelectorAll(".wa-service-list").length > 0) {
                const items = gsap.utils.toArray(".xeno-service-item");
                items.forEach((item, i) => {
                    const content = item.querySelector(".service-content");
                    const header = item.querySelector(".service-header");
                    gsap.to(content, {
                        height: 0,
                        ease: "none",
                        scrollTrigger: {
                            trigger: item,
                            start: "top " + header.clientHeight * i,
                            endTrigger: ".final",
                            end: "top " + header.clientHeight * items.length,
                            pin: true,
                            pinSpacing: false,
                            scrub: true,
                        }
                    });
                });
            }
        }
    });
    


    $(function () {
        var width = $(window).width();
        if (width > 768) { 
            "use strict";
            $(function () {
                let cards = gsap.utils.toArray(".wa-project-list .xeno-project-item");
                let stickDistance = 330; 
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



})(window.jQuery);