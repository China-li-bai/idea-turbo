import 'dart:math';

import 'package:flutter/material.dart';
import '../pet_store.dart';

class EntityLayer extends StatefulWidget {
  final PetStore store;
  const EntityLayer({super.key, required this.store});

  @override
  State<EntityLayer> createState() => _EntityLayerState();
}

class _EntityLayerState extends State<EntityLayer>
    with TickerProviderStateMixin {
  late AnimationController _breathController;
  late AnimationController _blinkController;
  late AnimationController _earController;
  late AnimationController _tailController;

  double _eyeTrackX = 0;
  double _eyeTrackY = 0;
  bool _isRubbing = false;

  @override
  void initState() {
    super.initState();
    _breathController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2500),
    )..repeat(reverse: true);

    _blinkController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 150),
    );

    _earController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );

    _tailController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    )..repeat(reverse: true);

    _startBlinkLoop();
    _startEarFlickLoop();

    widget.store.addListener(_onStoreChanged);
  }

  @override
  void dispose() {
    _breathController.dispose();
    _blinkController.dispose();
    _earController.dispose();
    _tailController.dispose();
    widget.store.removeListener(_onStoreChanged);
    super.dispose();
  }

  void _onStoreChanged() {
    if (!mounted) return;
    _updateEyeTracking();
    _updateRubbingState();
  }

  void _updateEyeTracking() {
    final renderBox = context.findRenderObject() as RenderBox?;
    if (renderBox == null || !renderBox.hasSize) return;

    final petCenter = renderBox.localToGlobal(
      Offset(renderBox.size.width / 2, renderBox.size.height * 0.38),
    );
    final lookAt = widget.store.lookAt;
    final dx = (lookAt.dx - petCenter.dx) / (renderBox.size.width / 2);
    final dy = (lookAt.dy - petCenter.dy) / (renderBox.size.height / 2);

    setState(() {
      _eyeTrackX = dx.clamp(-1.0, 1.0);
      _eyeTrackY = dy.clamp(-1.0, 1.0);
    });
  }

  void _updateRubbingState() {
    final isPointerDown = widget.store.isPointerDown;
    if (isPointerDown && !_isRubbing) {
      setState(() => _isRubbing = true);
      Future.delayed(const Duration(milliseconds: 300), () {
        if (widget.store.isPointerDown && mounted) {
          widget.store.setMood(PetMood.happy);
        }
      });
    } else if (!isPointerDown && _isRubbing) {
      setState(() => _isRubbing = false);
      Future.delayed(const Duration(seconds: 2), () {
        if (widget.store.mood == PetMood.happy && mounted) {
          widget.store.setMood(PetMood.idle);
        }
      });
    }
  }

  void _startBlinkLoop() {
    Future.delayed(Duration(milliseconds: 3000 + Random().nextInt(2000)), () {
      if (!mounted) return;
      _blinkController.forward().then((_) {
        _blinkController.reverse();
      });
      if (Random().nextDouble() > 0.8) {
        Future.delayed(const Duration(milliseconds: 250), () {
          if (!mounted) return;
          _blinkController.forward().then((_) {
            _blinkController.reverse();
          });
        });
      }
      _startBlinkLoop();
    });
  }

  void _startEarFlickLoop() {
    Future.delayed(Duration(milliseconds: 4000 + Random().nextInt(3000)), () {
      if (!mounted) return;
      _earController.forward().then((_) {
        _earController.reverse();
      });
      _startEarFlickLoop();
    });
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final baseSize = min(size.width, size.height);
    final petSize = baseSize * 0.52;

    return Center(
      child: SizedBox(
        width: petSize,
        height: petSize * 1.15,
        child: AnimatedBuilder(
          animation: Listenable.merge([
            _breathController,
            _blinkController,
            _earController,
            _tailController,
          ]),
          builder: (context, _) {
            final breathScaleY = 1.0 + _breathController.value * 0.018;
            final breathScaleX = 1.0 - _breathController.value * 0.008;
            final blinkValue = 1.0 - _blinkController.value * 0.9;

            return Transform.scale(
              scaleX: _isRubbing ? 1.04 : breathScaleX,
              scaleY: _isRubbing ? 0.96 : breathScaleY,
              child: Stack(
                alignment: Alignment.center,
                clipBehavior: Clip.none,
                children: [
                  _buildTail(petSize),
                  _buildTorso(petSize),
                  _buildHindLegs(petSize),
                  _buildBelly(petSize),
                  _buildForeLegs(petSize),
                  _buildHead(blinkValue, petSize),
                  if (_isRubbing) _buildRubHearts(),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildTorso(double petSize) {
    final torsoHeight = petSize * 0.52;
    final torsoWidth = petSize * 0.72;

    return Positioned(
      top: petSize * 0.34,
      left: (petSize - torsoWidth) / 2,
      child: Container(
        width: torsoWidth,
        height: torsoHeight,
        decoration: BoxDecoration(
          color: const Color(0xFFE08D40),
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(torsoHeight * 0.45),
            topRight: Radius.circular(torsoHeight * 0.45),
            bottomLeft: Radius.circular(torsoWidth * 0.28),
            bottomRight: Radius.circular(torsoWidth * 0.28),
          ),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFFC86420).withOpacity(0.25),
              offset: const Offset(-6, -8),
              blurRadius: 16,
              spreadRadius: 0,
            ),
            BoxShadow(
              color: Colors.black.withOpacity(0.10),
              offset: const Offset(0, 8),
              blurRadius: 20,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTail(double petSize) {
    final mood = widget.store.mood;
    final tailAngle = mood == PetMood.happy
        ? -12.0 + _tailController.value * 45.0
        : 8.0 + _tailController.value * 18.0;
    final tailLength = petSize * 0.30;
    final tailWidth = petSize * 0.055;

    return Positioned(
      top: petSize * 0.48,
      left: petSize * 0.62,
      child: Transform.rotate(
        angle: tailAngle * pi / 180,
        alignment: const Alignment(0, -0.7),
        child: Container(
          width: tailWidth,
          height: tailLength,
          decoration: BoxDecoration(
            color: const Color(0xFFC17025),
            borderRadius: BorderRadius.circular(tailWidth * 0.5),
          ),
        ),
      ),
    );
  }

  Widget _buildHindLegs(double petSize) {
    final pawWidth = petSize * 0.13;
    final pawHeight = petSize * 0.07;
    final legSpacing = petSize * 0.42;

    return Positioned(
      top: petSize * 0.76,
      left: (petSize - legSpacing) / 2 - pawWidth / 2,
      right: (petSize - legSpacing) / 2 - pawWidth / 2,
      bottom: petSize * 0.04,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          _buildPaw(width: pawWidth, height: pawHeight, isHind: true),
          _buildPaw(width: pawWidth, height: pawHeight, isHind: true),
        ],
      ),
    );
  }

  Widget _buildPaw({
    required double width,
    required double height,
    required bool isHind,
  }) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: const Color(0xFFF59D4A),
        borderRadius: BorderRadius.circular(width * 0.45),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.12),
            offset: const Offset(0, 3),
            blurRadius: 6,
          ),
        ],
      ),
      child: Center(
        child: Container(
          width: width * 0.65,
          height: height * 0.55,
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.92),
            borderRadius: BorderRadius.circular(width * 0.2),
          ),
        ),
      ),
    );
  }

  Widget _buildBelly(double petSize) {
    final bellyWidth = petSize * 0.48;
    final bellyHeight = petSize * 0.35;

    return Positioned(
      top: petSize * 0.42,
      left: (petSize - bellyWidth) / 2,
      child: GestureDetector(
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          width: bellyWidth,
          height: bellyHeight,
          decoration: BoxDecoration(
            color: _isRubbing
                ? const Color(0xFFFFF4EA)
                : const Color(0xFFFFECD8),
            borderRadius: BorderRadius.circular(bellyWidth * 0.42),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFFFFECD8).withOpacity(0.5),
                blurRadius: _isRubbing ? 10 : 4,
                spreadRadius: _isRubbing ? 3 : 0,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildForeLegs(double petSize) {
    final legWidth = petSize * 0.09;
    final legHeight = petSize * 0.22;
    final legSpacing = petSize * 0.50;

    return Positioned(
      top: petSize * 0.52,
      left: (petSize - legSpacing) / 2 - legWidth / 2,
      right: (petSize - legSpacing) / 2 - legWidth / 2,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _buildForeLeg(legWidth, legHeight, isLeft: true),
          _buildForeLeg(legWidth, legHeight, isLeft: false),
        ],
      ),
    );
  }

  Widget _buildForeLeg(double legWidth, double legHeight,
      {required bool isLeft}) {
    final rotateAngle = _isRubbing
        ? (isLeft
            ? 18.0 + _breathController.value * -50.0
            : -18.0 + _breathController.value * 50.0)
        : (isLeft
            ? 8.0 + _breathController.value * 4.0
            : -8.0 - _breathController.value * 4.0);

    return Transform.rotate(
      angle: rotateAngle * pi / 180,
      alignment: Alignment.topCenter,
      child: Container(
        width: legWidth,
        height: legHeight,
        decoration: BoxDecoration(
          color: const Color(0xFFF59D4A),
          borderRadius: BorderRadius.circular(legWidth * 0.5),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFFC86420).withOpacity(0.25),
              offset: const Offset(0, 3),
              blurRadius: 8,
            ),
            BoxShadow(
              color: Colors.black.withOpacity(0.10),
              offset: const Offset(0, 5),
              blurRadius: 10,
            ),
          ],
        ),
        child: Align(
          alignment: Alignment.bottomCenter,
          child: Container(
            width: legWidth * 0.82,
            height: legHeight * 0.30,
            margin: const EdgeInsets.only(bottom: 2),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.94),
              borderRadius: BorderRadius.circular(legWidth * 0.2),
              border: Border.all(
                color: const Color(0xFFD17A2A).withOpacity(0.15),
                width: 1,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHead(double blinkValue, double petSize) {
    final headSize = petSize * 0.44;
    final headOffsetX = _eyeTrackX * -12;
    final headOffsetY = _eyeTrackY * -10;
    final headRotate = _eyeTrackX * -2.5;

    return Positioned(
      top: petSize * 0.02,
      left: (petSize - headSize) / 2,
      child: SizedBox(
        width: headSize,
        height: headSize,
        child: Transform.translate(
          offset: Offset(headOffsetX, headOffsetY),
          child: Transform.rotate(
            angle: headRotate * pi / 180,
            child: Stack(
              alignment: Alignment.topCenter,
              clipBehavior: Clip.none,
              children: [
                _buildEars(headSize),
                _buildHeadBase(headSize),
                _buildFace(blinkValue, headSize),
                _buildWhiskers(headSize),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEars(double headSize) {
    final earWidth = headSize * 0.32;
    final earHeight = headSize * 0.36;

    return Positioned(
      top: -earHeight * 0.55,
      left: 0,
      right: 0,
      height: earHeight,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Transform.rotate(
            angle: (-18 + _earController.value * -25) * pi / 180,
            alignment: Alignment.bottomRight,
            child: _buildEar(earWidth, earHeight, isLeft: true),
          ),
          Transform.rotate(
            angle: (18 + _earController.value * 12) * pi / 180,
            alignment: Alignment.bottomLeft,
            child: _buildEar(earWidth, earHeight, isLeft: false),
          ),
        ],
      ),
    );
  }

  Widget _buildEar(double earWidth, double earHeight, {required bool isLeft}) {
    return Container(
      width: earWidth,
      height: earHeight,
      decoration: BoxDecoration(
        color: const Color(0xFFE08D40),
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(isLeft ? earWidth * 0.95 : earWidth * 0.2),
          topRight:
              Radius.circular(isLeft ? earWidth * 0.2 : earWidth * 0.95),
          bottomLeft: Radius.circular(isLeft ? earWidth * 0.5 : earWidth * 0.25),
          bottomRight:
              Radius.circular(isLeft ? earWidth * 0.25 : earWidth * 0.5),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.white.withOpacity(0.25),
            offset: const Offset(1.5, 1.5),
            blurRadius: 6,
          ),
        ],
      ),
      child: Center(
        child: Container(
          width: earWidth * 0.52,
          height: earWidth * 0.52,
          margin: EdgeInsets.only(
            top: earHeight * 0.18,
            left: isLeft ? earWidth * 0.1 : 0,
            right: isLeft ? 0 : earWidth * 0.1,
          ),
          decoration: BoxDecoration(
            color: const Color(0xFFFFB6B6).withOpacity(0.88),
            shape: BoxShape.circle,
          ),
        ),
      ),
    );
  }

  Widget _buildHeadBase(double headSize) {
    return Positioned(
      top: headSize * 0.14,
      left: headSize * 0.04,
      right: headSize * 0.04,
      height: headSize * 0.78,
      child: Container(
        decoration: BoxDecoration(
          color: const Color(0xFFF59D4A),
          borderRadius: BorderRadius.only(
            topLeft: Radius.elliptical(headSize * 0.42, headSize * 0.42),
            topRight: Radius.elliptical(headSize * 0.42, headSize * 0.42),
            bottomLeft: Radius.elliptical(headSize * 0.38, headSize * 0.38),
            bottomRight: Radius.elliptical(headSize * 0.38, headSize * 0.38),
          ),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFFC86420).withOpacity(0.35),
              offset: const Offset(0, 10),
              blurRadius: 20,
            ),
          ],
        ),
        child: Stack(
          children: [
            Center(
              child: Container(
                width: headSize * 0.045,
                height: headSize * 0.24,
                margin: const EdgeInsets.only(top: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFC17025).withOpacity(0.55),
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
            ),
            Transform.translate(
              offset: Offset(-headSize * 0.11, headSize * 0.04),
              child: Center(
                child: Container(
                  width: headSize * 0.036,
                  height: headSize * 0.20,
                  decoration: BoxDecoration(
                    color: const Color(0xFFC17025).withOpacity(0.55),
                    borderRadius: BorderRadius.circular(2),
                  ),
                  transform: Matrix4.rotationZ(20 * pi / 180),
                ),
              ),
            ),
            Transform.translate(
              offset: Offset(headSize * 0.11, headSize * 0.04),
              child: Center(
                child: Container(
                  width: headSize * 0.036,
                  height: headSize * 0.20,
                  decoration: BoxDecoration(
                    color: const Color(0xFFC17025).withOpacity(0.55),
                    borderRadius: BorderRadius.circular(2),
                  ),
                  transform: Matrix4.rotationZ(-20 * pi / 180),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFace(double blinkValue, double headSize) {
    return Positioned(
      top: headSize * 0.40,
      left: 0,
      right: 0,
      child: Column(
        children: [
          _buildEyes(blinkValue, headSize),
          SizedBox(height: headSize * 0.06),
          _buildNoseAndMouth(headSize),
        ],
      ),
    );
  }

  Widget _buildEyes(double blinkValue, double headSize) {
    final eyeSize = headSize * 0.22;
    final eyeSpacing = headSize * 0.16;

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _buildEye(blinkValue, eyeSize, isLeft: true),
        SizedBox(width: eyeSpacing),
        _buildEye(blinkValue, eyeSize, isLeft: false),
      ],
    );
  }

  Widget _buildEye(double blinkValue, double eyeSize,
      {required bool isLeft}) {
    final pupilOffsetX = _eyeTrackX * eyeSize * 0.18;
    final pupilOffsetY = _eyeTrackY * eyeSize * 0.22;
    final irisSize = eyeSize * 0.82;
    final pupilScaleX = _isRubbing ? 2.2 : 1.0;

    return Container(
      width: eyeSize,
      height: eyeSize,
      decoration: BoxDecoration(
        color: Colors.white,
        shape: BoxShape.circle,
        border: Border.all(color: const Color(0xFFE08D40), width: eyeSize * 0.045),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.18),
            offset: const Offset(0, 3),
            blurRadius: 8,
            spreadRadius: -2,
          ),
        ],
      ),
      child: Center(
        child: Transform.scale(
          scaleY: blinkValue,
          scaleX: 1.0,
          child: Container(
            width: irisSize,
            height: irisSize,
            decoration: BoxDecoration(
              color: const Color(0xFFFFC526),
              shape: BoxShape.circle,
              border: Border.all(
                  color: const Color(0xFFB38D1A), width: eyeSize * 0.022),
            ),
            child: Transform.translate(
              offset: Offset(pupilOffsetX, pupilOffsetY),
              child: Transform.scale(
                scaleX: pupilScaleX,
                child: Container(
                  width: irisSize * 0.28,
                  height: irisSize * 0.68,
                  decoration: BoxDecoration(
                    color: const Color(0xFF2A1A0A),
                    borderRadius:
                        BorderRadius.circular(irisSize * 0.14),
                  ),
                  child: Align(
                    alignment: const Alignment(0.3, -0.3),
                    child: Container(
                      width: irisSize * 0.18,
                      height: irisSize * 0.18,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.white.withOpacity(0.85),
                            blurRadius: 5,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNoseAndMouth(double headSize) {
    return Column(
      children: [
        Container(
          width: headSize * 0.10,
          height: headSize * 0.065,
          decoration: BoxDecoration(
            color: const Color(0xFFFF9A9A),
            borderRadius: BorderRadius.circular(headSize * 0.04),
            border: Border.all(
                color: const Color(0xFFFF7A7A), width: headSize * 0.008),
          ),
        ),
        SizedBox(height: headSize * 0.015),
        _isRubbing ? _buildOpenMouth(headSize) : _buildClosedMouth(headSize),
      ],
    );
  }

  Widget _buildClosedMouth(double headSize) {
    final w = headSize * 0.12;
    final h = headSize * 0.085;

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          width: w,
          height: h,
          decoration: const BoxDecoration(
            border: Border(
              bottom: BorderSide(color: Color(0xFF5A3F2A), width: 2.2),
              right: BorderSide(color: Color(0xFF5A3F2A), width: 2.2),
            ),
            borderRadius: BorderRadius.only(bottomRight: Radius.circular(10)),
          ),
        ),
        Container(
          width: w,
          height: h,
          decoration: const BoxDecoration(
            border: Border(
              bottom: BorderSide(color: Color(0xFF5A3F2A), width: 2.2),
              left: BorderSide(color: Color(0xFF5A3F2A), width: 2.2),
            ),
            borderRadius: BorderRadius.only(bottomLeft: Radius.circular(10)),
          ),
        ),
      ],
    );
  }

  Widget _buildOpenMouth(double headSize) {
    final mouthSize = headSize * 0.14;

    return AnimatedOpacity(
      opacity: _isRubbing ? 1.0 : 0.0,
      duration: const Duration(milliseconds: 200),
      child: Container(
        width: mouthSize,
        height: mouthSize,
        decoration: BoxDecoration(
          color: const Color(0xFFFF9A9A),
          borderRadius: BorderRadius.only(
            bottomLeft: Radius.circular(mouthSize * 0.6),
            bottomRight: Radius.circular(mouthSize * 0.6),
          ),
          border: const Border(
            top: BorderSide(color: Color(0xFF5A3F2A), width: 1.8),
          ),
        ),
        child: Align(
          alignment: Alignment.topCenter,
          child: Container(
            width: mouthSize,
            height: mouthSize * 0.5,
            margin: EdgeInsets.only(top: mouthSize * 0.28),
            decoration: BoxDecoration(
              color: const Color(0xFF4A2010),
              borderRadius: BorderRadius.circular(mouthSize * 0.15),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildWhiskers(double headSize) {
    final whiskerLength = headSize * 0.32;
    final strokeWidth = headSize * 0.012;

    return Positioned(
      top: headSize * 0.60,
      left: -whiskerLength * 0.3,
      right: -whiskerLength * 0.3,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _buildWhiskerGroup(whiskerLength, strokeWidth, isLeft: true),
          _buildWhiskerGroup(whiskerLength, strokeWidth, isLeft: false),
        ],
      ),
    );
  }

  Widget _buildWhiskerGroup(double length, double stroke,
      {required bool isLeft}) {
    return SizedBox(
      width: length,
      height: length * 0.5,
      child: Stack(
        children: [
          CustomPaint(
            size: Size(length, length * 0.5),
            painter: _WhiskerPainter(
              start: Offset(isLeft ? length : 0, length * 0.05),
              end: Offset(isLeft ? 0 : length, -length * 0.12),
              color: Colors.white.withOpacity(0.5),
              strokeWidth: stroke,
            ),
          ),
          CustomPaint(
            size: Size(length, length * 0.5),
            painter: _WhiskerPainter(
              start: Offset(isLeft ? length : 0, length * 0.22),
              end: Offset(isLeft ? 0 : length, length * 0.06),
              color: Colors.white.withOpacity(0.45),
              strokeWidth: stroke,
            ),
          ),
          CustomPaint(
            size: Size(length, length * 0.5),
            painter: _WhiskerPainter(
              start: Offset(isLeft ? length : 0, length * 0.39),
              end: Offset(isLeft ? 0 : length, length * 0.28),
              color: Colors.white.withOpacity(0.4),
              strokeWidth: stroke,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRubHearts() {
    return Positioned.fill(
      child: IgnorePointer(
        child: TweenAnimationBuilder<double>(
          tween: Tween(begin: 0.8, end: 1.0),
          duration: const Duration(milliseconds: 600),
          builder: (context, value, child) {
            return Opacity(
              opacity: 0.6,
              child: Transform.translate(
                offset: Offset(0, -4 * (1 - value)),
                child: Transform.scale(
                  scale: value,
                  child: const Text('❤️',
                      style: TextStyle(fontSize: 28)),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _WhiskerPainter extends CustomPainter {
  final Offset start;
  final Offset end;
  final Color color;
  final double strokeWidth;

  _WhiskerPainter({
    required this.start,
    required this.end,
    required this.color,
    required this.strokeWidth,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final path = Path()
      ..moveTo(start.dx, start.dy)
      ..quadraticBezierTo(
        (start.dx + end.dx) / 2 + (end.dy - start.dy) * 0.15,
        (start.dy + end.dy) / 2,
        end.dx,
        end.dy,
      );
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _WhiskerPainter oldDelegate) =>
      start != oldDelegate.start ||
      end != oldDelegate.end ||
      color != oldDelegate.color ||
      strokeWidth != oldDelegate.strokeWidth;
}
