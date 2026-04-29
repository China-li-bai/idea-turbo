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
      Offset(renderBox.size.width / 2, renderBox.size.height / 2 - 60),
    );
    final lookAt = widget.store.lookAt;
    final dx = (lookAt.dx - petCenter.dx) / (renderBox.size.width / 2);
    final dy = (lookAt.dy - petCenter.dy) / (renderBox.size.height / 2);

    setState(() {
      _eyeTrackX = (dx).clamp(-1.0, 1.0);
      _eyeTrackY = (dy).clamp(-1.0, 1.0);
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
    final petWidth = size.width * 0.6;
    final petHeight = size.height * 0.55;

    return Center(
      child: SizedBox(
        width: petWidth,
        height: petHeight,
        child: AnimatedBuilder(
          animation: Listenable.merge([
            _breathController,
            _blinkController,
            _earController,
            _tailController,
          ]),
          builder: (context, _) {
            final breathScaleY = 1.0 + _breathController.value * 0.02;
            final breathScaleX = 1.0 - _breathController.value * 0.01;
            final blinkValue = 1.0 - _blinkController.value * 0.9;

            return Transform.scale(
              scaleX: _isRubbing ? 1.05 : breathScaleX,
              scaleY: _isRubbing ? 0.95 : breathScaleY,
              child: Stack(
                alignment: Alignment.center,
                clipBehavior: Clip.none,
                children: [
                  _buildTail(),
                  _buildTorso(),
                  _buildHindLegs(),
                  _buildBelly(),
                  _buildForeLegs(),
                  _buildHead(blinkValue),
                  if (_isRubbing) _buildRubHearts(),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildTorso() {
    return Positioned(
      top: 80,
      left: 10,
      right: 10,
      bottom: 40,
      child: Container(
        decoration: BoxDecoration(
          color: const Color(0xFFE08D40),
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(100),
            topRight: const Radius.circular(100),
            bottomLeft: Radius.elliptical(
                MediaQuery.of(context).size.width * 0.2,
                MediaQuery.of(context).size.height * 0.05),
            bottomRight: Radius.elliptical(
                MediaQuery.of(context).size.width * 0.2,
                MediaQuery.of(context).size.height * 0.05),
          ),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFFC86420).withOpacity(0.3),
              offset: const Offset(-10, -10),
              blurRadius: 20,
              spreadRadius: 0,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTail() {
    final mood = widget.store.mood;
    final tailAngle = mood == PetMood.happy
        ? -10.0 + _tailController.value * 50.0
        : 10.0 + _tailController.value * 20.0;

    return Positioned(
      top: 100,
      right: -15,
      child: Transform.rotate(
        angle: tailAngle * pi / 180,
        alignment: const Alignment(0, -0.8),
        child: Container(
          width: 12,
          height: 80,
          decoration: BoxDecoration(
            color: const Color(0xFFC17025),
            borderRadius: BorderRadius.circular(6),
          ),
        ),
      ),
    );
  }

  Widget _buildHindLegs() {
    return Positioned(
      top: 80,
      left: 0,
      right: 0,
      bottom: 0,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Transform.translate(
            offset: const Offset(-10, 5),
            child: _buildPaw(isLeft: true, isHind: true),
          ),
          Transform.translate(
            offset: const Offset(10, 5),
            child: _buildPaw(isLeft: false, isHind: true),
          ),
        ],
      ),
    );
  }

  Widget _buildPaw({required bool isLeft, required bool isHind}) {
    final width = isHind ? 55.0 : 40.0;
    final height = isHind ? 30.0 : 50.0;

    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: const Color(0xFFF59D4A),
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(isLeft ? 50 : 30),
          topRight: Radius.circular(isLeft ? 30 : 50),
          bottomLeft: Radius.circular(isLeft ? 30 : 50),
          bottomRight: Radius.circular(isLeft ? 50 : 30),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.15),
            offset: const Offset(0, 4),
            blurRadius: 8,
          ),
        ],
      ),
      child: Center(
        child: Container(
          width: width * 0.7,
          height: height * 0.6,
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.9),
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),
    );
  }

  Widget _buildBelly() {
    return Positioned(
      top: 100,
      left: 25,
      right: 25,
      bottom: 50,
      child: GestureDetector(
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          decoration: BoxDecoration(
            color: _isRubbing
                ? const Color(0xFFFFF4EA)
                : const Color(0xFFFFECD8),
            borderRadius: BorderRadius.circular(60),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFFFFECD8).withOpacity(0.6),
                blurRadius: _isRubbing ? 12 : 6,
                spreadRadius: _isRubbing ? 4 : 0,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildForeLegs() {
    return Positioned(
      top: 85,
      left: -5,
      right: -5,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _buildForeLeg(isLeft: true),
          _buildForeLeg(isLeft: false),
        ],
      ),
    );
  }

  Widget _buildForeLeg({required bool isLeft}) {
    final rotateAngle = _isRubbing
        ? (isLeft ? 15.0 + _breathController.value * -55.0 : -15.0 + _breathController.value * 55.0)
        : (isLeft ? 10.0 + _breathController.value * 5.0 : -10.0 - _breathController.value * 5.0);

    return Transform.rotate(
      angle: rotateAngle * pi / 180,
      alignment: Alignment.topCenter,
      child: Container(
        width: 35,
        height: 70,
        decoration: BoxDecoration(
          color: const Color(0xFFF59D4A),
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFFC86420).withOpacity(0.3),
              offset: const Offset(0, 4),
              blurRadius: 12,
            ),
            BoxShadow(
              color: Colors.black.withOpacity(0.15),
              offset: const Offset(0, 8),
              blurRadius: 15,
            ),
          ],
        ),
        child: Align(
          alignment: Alignment.bottomCenter,
          child: Container(
            width: 30,
            height: 22,
            margin: const EdgeInsets.only(bottom: 2),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.95),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: const Color(0xFFD17A2A).withOpacity(0.2),
                width: 1,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHead(double blinkValue) {
    final headOffsetX = _eyeTrackX * -15;
    final headOffsetY = _eyeTrackY * -12;
    final headRotate = _eyeTrackX * -3;

    return Positioned(
      top: 0,
      left: 15,
      right: 15,
      height: 140,
      child: Transform.translate(
        offset: Offset(headOffsetX, headOffsetY),
        child: Transform.rotate(
          angle: headRotate * pi / 180,
          child: Stack(
            alignment: Alignment.topCenter,
            clipBehavior: Clip.none,
            children: [
              _buildEars(),
              _buildHeadBase(),
              _buildFace(blinkValue),
              _buildWhiskers(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEars() {
    return Positioned(
      top: -15,
      left: 0,
      right: 0,
      height: 50,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Transform.rotate(
            angle: (-15 + _earController.value * -30) * pi / 180,
            alignment: Alignment.bottomRight,
            child: _buildEar(isLeft: true),
          ),
          Transform.rotate(
            angle: (15 + _earController.value * 10) * pi / 180,
            alignment: Alignment.bottomLeft,
            child: _buildEar(isLeft: false),
          ),
        ],
      ),
    );
  }

  Widget _buildEar({required bool isLeft}) {
    return Container(
      width: 45,
      height: 50,
      decoration: BoxDecoration(
        color: const Color(0xFFE08D40),
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(isLeft ? 100 : 12),
          topRight: Radius.circular(isLeft ? 12 : 100),
          bottomLeft: Radius.circular(isLeft ? 40 : 20),
          bottomRight: Radius.circular(isLeft ? 20 : 40),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.white.withOpacity(0.3),
            offset: const Offset(2, 2),
            blurRadius: 8,
          ),
        ],
      ),
      child: Center(
        child: Container(
          width: 25,
          height: 25,
          margin: EdgeInsets.only(
            top: 10,
            left: isLeft ? 5 : 0,
            right: isLeft ? 0 : 5,
          ),
          decoration: BoxDecoration(
            color: const Color(0xFFFFB6B6).withOpacity(0.9),
            shape: BoxShape.circle,
          ),
        ),
      ),
    );
  }

  Widget _buildHeadBase() {
    return Positioned(
      top: 15,
      left: 5,
      right: 5,
      height: 110,
      child: Container(
        decoration: BoxDecoration(
          color: const Color(0xFFF59D4A),
          borderRadius: BorderRadius.only(
            topLeft: const Radius.elliptical(50, 50),
            topRight: const Radius.elliptical(50, 50),
            bottomLeft: Radius.elliptical(45, 45),
            bottomRight: Radius.elliptical(45, 45),
          ),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFFC86420).withOpacity(0.4),
              offset: const Offset(0, 15),
              blurRadius: 25,
            ),
          ],
        ),
        child: Stack(
          children: [
            Center(
              child: Container(
                width: 5,
                height: 30,
                margin: const EdgeInsets.only(top: 5),
                decoration: BoxDecoration(
                  color: const Color(0xFFC17025).withOpacity(0.6),
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
            ),
            Transform.translate(
              offset: const Offset(-12, 5),
              child: Center(
                child: Container(
                  width: 4,
                  height: 25,
                  decoration: BoxDecoration(
                    color: const Color(0xFFC17025).withOpacity(0.6),
                    borderRadius: BorderRadius.circular(2),
                  ),
                  transform: Matrix4.rotationZ(20 * pi / 180),
                ),
              ),
            ),
            Transform.translate(
              offset: const Offset(12, 5),
              child: Center(
                child: Container(
                  width: 4,
                  height: 25,
                  decoration: BoxDecoration(
                    color: const Color(0xFFC17025).withOpacity(0.6),
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

  Widget _buildFace(double blinkValue) {
    return Positioned(
      top: 50,
      left: 0,
      right: 0,
      child: Column(
        children: [
          _buildEyes(blinkValue),
          const SizedBox(height: 8),
          _buildNoseAndMouth(),
        ],
      ),
    );
  }

  Widget _buildEyes(double blinkValue) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _buildEye(blinkValue, isLeft: true),
        const SizedBox(width: 25),
        _buildEye(blinkValue, isLeft: false),
      ],
    );
  }

  Widget _buildEye(double blinkValue, {required bool isLeft}) {
    final pupilOffsetX = _eyeTrackX * 8;
    final pupilOffsetY = _eyeTrackY * 10;
    final scaleX = _isRubbing ? 2.0 : 1.0;

    return Container(
      width: 42,
      height: 42,
      decoration: BoxDecoration(
        color: Colors.white,
        shape: BoxShape.circle,
        border: Border.all(color: const Color(0xFFE08D40), width: 2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.2),
            offset: const Offset(0, 4),
            blurRadius: 10,
            spreadRadius: -2,
          ),
        ],
      ),
      child: Center(
        child: Transform.scale(
          scaleY: blinkValue,
          scaleX: 1.0,
          child: Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: const Color(0xFFFFC526),
              shape: BoxShape.circle,
              border: Border.all(color: const Color(0xFFB38D1A), width: 1),
            ),
            child: Transform.translate(
              offset: Offset(pupilOffsetX, pupilOffsetY),
              child: Transform.scale(
                scaleX: scaleX,
                child: Container(
                  width: 10,
                  height: 28,
                  decoration: BoxDecoration(
                    color: const Color(0xFF2A1A0A),
                    borderRadius: BorderRadius.circular(5),
                  ),
                  child: Align(
                    alignment: const Alignment(0.3, -0.3),
                    child: Container(
                      width: 7,
                      height: 7,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.white.withOpacity(0.9),
                            blurRadius: 6,
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

  Widget _buildNoseAndMouth() {
    return Column(
      children: [
        Container(
          width: 14,
          height: 9,
          decoration: BoxDecoration(
            color: const Color(0xFFFF9A9A),
            borderRadius: BorderRadius.circular(5),
            border: Border.all(color: const Color(0xFFFF7A7A), width: 1),
          ),
        ),
        const SizedBox(height: 2),
        _isRubbing ? _buildOpenMouth() : _buildClosedMouth(),
      ],
    );
  }

  Widget _buildClosedMouth() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          width: 16,
          height: 12,
          decoration: const BoxDecoration(
            border: Border(
              bottom: BorderSide(color: Color(0xFF5A3F2A), width: 2.5),
              right: BorderSide(color: Color(0xFF5A3F2A), width: 2.5),
            ),
            borderRadius: BorderRadius.only(
              bottomRight: Radius.circular(12),
            ),
          ),
        ),
        Container(
          width: 16,
          height: 12,
          decoration: const BoxDecoration(
            border: Border(
              bottom: BorderSide(color: Color(0xFF5A3F2A), width: 2.5),
              left: BorderSide(color: Color(0xFF5A3F2A), width: 2.5),
            ),
            borderRadius: BorderRadius.only(
              bottomLeft: Radius.circular(12),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildOpenMouth() {
    return AnimatedOpacity(
      opacity: _isRubbing ? 1.0 : 0.0,
      duration: const Duration(milliseconds: 200),
      child: Container(
        width: 18,
        height: 18,
        decoration: BoxDecoration(
          color: const Color(0xFFFF9A9A),
          borderRadius: BorderRadius.only(
            bottomLeft: Radius.circular(10),
            bottomRight: Radius.circular(10),
          ),
          border: const Border(
            top: BorderSide(color: Color(0xFF5A3F2A), width: 2),
          ),
        ),
        child: Align(
          alignment: Alignment.topCenter,
          child: Container(
            width: 18,
            height: 10,
            margin: const EdgeInsets.only(top: 5),
            decoration: BoxDecoration(
              color: const Color(0xFFFF7A7A),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(10),
                topRight: Radius.circular(10),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildWhiskers() {
    return Positioned(
      top: 65,
      left: -20,
      right: -20,
      height: 25,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _buildWhiskerSet(isLeft: true),
          _buildWhiskerSet(isLeft: false),
        ],
      ),
    );
  }

  Widget _buildWhiskerSet({required bool isLeft}) {
    return SizedBox(
      width: 50,
      height: 25,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Transform.rotate(
            angle: (isLeft ? 15 : -15) * pi / 180,
            alignment: isLeft ? Alignment.centerRight : Alignment.centerLeft,
            child: Container(
              width: 50,
              height: 1.5,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.7),
                borderRadius: BorderRadius.circular(1),
              ),
            ),
          ),
          const SizedBox(height: 6),
          Transform.rotate(
            angle: (isLeft ? -5 : 5) * pi / 180,
            alignment: isLeft ? Alignment.centerRight : Alignment.centerLeft,
            child: Container(
              width: 45,
              height: 1.5,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.7),
                borderRadius: BorderRadius.circular(1),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRubHearts() {
    return Positioned(
      top: 30,
      left: 0,
      right: 0,
      child: Center(
        child: TweenAnimationBuilder<double>(
          tween: Tween(begin: 0, end: 1),
          duration: const Duration(milliseconds: 800),
          builder: (context, value, child) {
            return Opacity(
              opacity: 1 - value,
              child: Transform.translate(
                offset: Offset(0, -80 * value),
                child: Transform.scale(
                  scale: 0.5 + value * 1.0,
                  child: const Text(
                    '❤️',
                    style: TextStyle(fontSize: 36),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
