// Pop Up On Image

$("#fixed-form-container .body").hide();
$("#fixed-form-container .image").on("click", function(e){
    $(this).next("#fixed-form-container div").slideToggle(400);
    $(this).toggleClass("expanded");
});

// Offer Dot Pop Up On Image

document.addEventListener("DOMContentLoaded", function () {
    let dots = document.querySelectorAll(".dot");

    dots.forEach(dot => {
        let popup = dot.nextElementSibling;

        dot.addEventListener("mouseenter", function () {
            popup.style.opacity = "1";
            popup.style.visibility = "visible";
            popup.style.transform = "translateY(0)";
        });

        dot.addEventListener("mouseleave", function () {
            popup.style.opacity = "0";
            popup.style.visibility = "hidden";
            popup.style.transform = "translateX(-10px)";
        });
    });
});