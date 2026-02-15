<?php
$site_title = 'Blog Standard | Xeno - Startup & Agency PHP Templatete';
$special_css = 'innerpages';
$special_js = 'creative-agency';
$body_class = 'xeno-inner-page';
$page_sub_title = 'Blog Standard';
$page_title = 'Insights That Drive <br> Transformation';
require_once 'layout/headers/header-one.php';
include 'parts/common/page-title-banner.php';
?>

<!--======  Start Blog Standard Section  ======-->
<section class="xeno-blog-standard-sec pb-80">
	<div class="container">
		<div class="row">
			<div class="col-xl-8">
				<!--=== Blog Standard Wrapper ===-->
				<div class="blog-standard-wrapper mb-50">
					<!--=== Blog Post Item ===-->
					<div class="xeno-blog-post-two mb-50" data-aos="fade-up" data-aos-duration="600">
						<div class="thumbnail">
							<img src="assets/images/innerpage/blog/blog_st1.jpg" alt="Blog Thumbnail">
						</div>
						<div class="content">
							<div class="post-meta style-one">
								<span class="category"><a href="#">Business</a></span>
								<span class="date"><a href="#">September 20, 2024</a></span>
							</div>
							<h4 class="title"><a href="blog-details.php">Unlocking the Power of Digital
								Transform for Business</a></h4>
							<p>Business consulting is a service designed to help organizations solve complex problems, improve performance, and achieve their goals through expert guidance and tailored strategies.</p>
							<a href="blog-details.php" class="read-more style-one">Read More <i class="far fa-arrow-right"></i></a>
						</div>
					</div>
					<!--=== Blog Post Item ===-->
					<div class="blog-quote-post-item mb-50" data-aos="fade-up" data-aos-duration="800">
						<div class="post-content">
							<div class="post-meta style-one">
								<span class="date"><a href="#">September 20, 2024</a></span>
							</div>
							<h4 class="title">"Success in business isn’t just about solving problems, but about anticipating challenges and turning them into opportunities."</h4>
							<p><cite>Mario C. Doran</cite></p>
						</div>
					</div>
					<!--=== Blog Post Item ===-->
					<div class="xeno-blog-post-two mb-50" data-aos="fade-up" data-aos-duration="1000">
						<div class="thumbnail">
							<img src="assets/images/innerpage/blog/blog_st2.jpg" alt="Blog Thumbnail">
							<div class="play-button">
								<a href="https://www.youtube.com/watch?v=D6446Z5z7p8" class="video-popup"><i class="fas fa-play"></i></a>
							</div>
						</div>
						<div class="content">
							<div class="post-meta style-one">
								<span class="category"><a href="#">Business</a></span>
								<span class="date"><a href="#">September 20, 2024</a></span>
							</div>
							<h4 class="title"><a href="blog-details.php">Unlocking the Power of Digital
								Transform for Business</a></h4>
							<p>Business consulting is a service designed to help organizations solve complex problems, improve performance, and achieve their goals through expert guidance and tailored strategies.</p>
							<a href="blog-details.php" class="read-more style-one">Read More <i class="far fa-arrow-right"></i></a>
						</div>
					</div>
					<!--=== Blog Post Item ===-->
					<div class="blog-quote-post-item mb-50" data-aos="fade-up" data-aos-duration="1200">
						<div class="post-content">
							<div class="post-meta style-one">
								<span class="date"><a href="#">September 20, 2024</a></span>
							</div>
							<h4 class="title"><a href="blog-details.php">"The Future of Digital Transformation: What Every Business Needs to Know"</a></h4>
							<p><cite>Mario C. Doran</cite></p>
						</div>
					</div>
					<!--=== Blog Post Item ===-->
					<div class="xeno-blog-post-two style-three mb-50" data-aos="fade-up" data-aos-duration="1400">
						<div class="thumbnail">
							<img src="assets/images/innerpage/blog/blog_st3.jpg" alt="Blog Thumbnail">
						</div>
						<div class="content">
							<div class="post-meta style-one">
								<span class="category"><a href="#">Business</a></span>
								<span class="date"><a href="#">September 20, 2024</a></span>
							</div>
							<h4 class="title"><a href="blog-details.php">How Leadership Drives Organizational Success</a></h4>
							<p>Business consulting is a service designed to help organizations solve complex problems, improve performance, and achieve their goals through expert guidance and tailored strategies.</p>
							<a href="blog-details.php" class="read-more style-one">Read More <i class="far fa-arrow-right"></i></a>
						</div>
					</div>
					<div class="xeno-pagination mt-30">
						<ul>
							<li><a href="#"><i class="far fa-angle-double-left"></i></a></li>
							<li><a href="#" class="active">1</a></li>
							<li><a href="#">2</a></li>
							<li><a href="#">3</a></li>
							<li><a href="#"><i class="far fa-angle-double-right"></i></a></li>
						</ul>
					</div>
				</div>
			</div>
			<div class="col-xl-4">
				<?php include 'parts/blog/sidebar.php'; ?>
			</div>
		</div>
	</div>
</section><!--======  End Blog Standard Section  ======-->

<?php
require_once 'layout/footers/xeno-footer-ca.php';