import { AjalaJourney } from "./main";
import Placement from "./placement";
import UI from "./ui";
import Animations from "./animations";

class Navigation {
  ajala: AjalaJourney;
  ui: UI;
  placement?: Placement;
  animations?: Animations;

  constructor({ ajala, ui }: { ajala: AjalaJourney; ui: UI }) {
    this.ajala = ajala;
    this.ui = ui;

    this.next = this.next.bind(this);
    this.prev = this.prev.bind(this);
    this.close = this.close.bind(this);
  }

  init() {
    this.next = this.next.bind(this);
    this.prev = this.prev.bind(this);
    this.close = this.close.bind(this);
  }

  async goTo(index: number) {
    if (this.animations?.is_animating) return;
    if (this.ajala.getFlattenSteps()[index]?.skip) {
      console.warn("You can't go to an ajala step that's meant to be skipped");
      return;
    }

    if (index >= 0 && index <= this.ajala.getFlattenSteps().length) {
      this.animations!.is_animating = true;
      this.ui.resetOverlayCutoutSvgRect();

      const stepInActiveCallback =
        this.ajala.getOriginalSteps()[this.ajala.getActiveStepOriginalIndex()]
          ?.onInActive;

      if (
        stepInActiveCallback &&
        index !== this.ajala.getActiveStepFlattenIndex()
      ) {
        stepInActiveCallback(this.ajala.getActiveStep()!, this.ajala);
      }

      const distance_option =
        await this.placement!.tooltip.calculateTravelDistance(index);

      const onComplete = () => {
        this.animations!.is_animating = false;
        this.ajala.active_step =
          this.ajala.getFlattenSteps()[distance_option.active_index];

        this.ui.update(distance_option);

        const stepActiveCallback =
          this.ajala.getOriginalSteps()[this.ajala.getActiveStepOriginalIndex()]
            ?.onActive;

        if (stepActiveCallback) {
          stepActiveCallback(this.ajala.getActiveStep()!, this.ajala);
        }
        this.ajala.dispatchEvent({
          type: "onTransitionComplete",
          data: {
            transitionType: "goTo",
            self: this.ajala,
          },
        });
      };

      this.animations!.transition[this.animations!.transition_type](
        distance_option,
        {
          onComplete: onComplete,
        },
      );
    }
  }

  async next() {
    if (this.animations!.is_animating) return;

    let next_index = this.ajala.getActiveStepFlattenIndex() + 1;
    next_index = this.getValidNavIndex(next_index, "next");

    if (this.ajala.getFlattenSteps().length > next_index) {
      this.animations!.is_animating = true;

      const stepInActiveCallback =
        this.ajala.getOriginalSteps()[this.ajala.getActiveStepOriginalIndex()]
          ?.onInActive;

      if (
        stepInActiveCallback &&
        next_index !== this.ajala.getActiveStepFlattenIndex()
      ) {
        stepInActiveCallback(this.ajala.getActiveStep()!, this.ajala);
      }

      this.ajala.dispatchEvent({
        type: "onNext",
        data: this.ajala,
      });

      this.ui!.resetOverlayCutoutSvgRect();

      const distance_option =
        await this.placement!.tooltip.calculateTravelDistance(next_index);
      const onComplete = () => {
        this.animations!.is_animating = false;
        this.ajala.active_step =
          this.ajala.getFlattenSteps()[distance_option.active_index];

        this.ui!.update(distance_option);

        const stepActiveCallback =
          this.ajala.getOriginalSteps()[this.ajala.getActiveStepOriginalIndex()]
            ?.onActive;
        if (stepActiveCallback) {
          stepActiveCallback(this.ajala.getActiveStep()!, this.ajala);
        }

        this.ajala.dispatchEvent({
          type: "onTransitionComplete",
          data: {
            transitionType: "next",
            self: this.ajala,
          },
        });
      };

      this.animations!.transition[this.animations!.transition_type](
        distance_option,
        {
          onComplete: onComplete,
        },
      );
    } else {
      this.ajala.dispatchEvent({
        type: "onFinish",
        data: this.ajala,
      });

      this.ajala.destroy();
    }
  }

  async prev() {
    if (this.animations!.is_animating) return;
    let prev_index = this.ajala.getActiveStepFlattenIndex() - 1;
    prev_index = this.getValidNavIndex(prev_index, "prev");

    if (prev_index > -1) {
      this.animations!.is_animating = true;

      const stepInActiveCallback =
        this.ajala.getOriginalSteps()[this.ajala.getActiveStepOriginalIndex()]
          ?.onInActive;
      if (
        stepInActiveCallback &&
        prev_index !== this.ajala.getActiveStepFlattenIndex()
      ) {
        stepInActiveCallback(this.ajala.getActiveStep()!, this.ajala);
      }

      this.ajala.dispatchEvent({
        type: "onPrev",
        data: this.ajala,
      });
      this.ui!.resetOverlayCutoutSvgRect();

      const distance_option =
        await this.placement!.tooltip.calculateTravelDistance(prev_index);

      const onComplete = () => {
        this.animations!.is_animating = false;
        this.ajala.active_step =
          this.ajala.getFlattenSteps()[distance_option.active_index];

        this.ui!.update(distance_option);

        const stepActiveCallback =
          this.ajala.getOriginalSteps()[this.ajala.getActiveStepOriginalIndex()]
            ?.onActive;
        if (stepActiveCallback) {
          stepActiveCallback(this.ajala.getActiveStep()!, this.ajala);
        }

        this.ajala.dispatchEvent({
          type: "onTransitionComplete",
          data: {
            transitionType: "prev",
            self: this.ajala,
          },
        });
      };

      this.animations!.transition[this.animations!.transition_type](
        distance_option,
        {
          onComplete: onComplete,
        },
      );
    }
  }

  getValidNavIndex(index: number, type: "next" | "prev") {
    /**
     * Check if index step is meant to be skipped.
     * Loop through the steps till we find a step that's not skipped
     */

    const index_step = this.ajala.getFlattenSteps()[index];
    let valid_index = index;

    if (type === "next" && index_step?.skip) {
      valid_index = this.ajala.getFlattenSteps().length;
      for (let i = index; i < this.ajala.getFlattenSteps().length; i++) {
        const step = this.ajala.getFlattenSteps()[i];

        if (step?.skip) {
          continue;
        } else {
          valid_index = i;
          break;
        }
      }
    } else if (type === "prev" && index_step?.skip) {
      valid_index = -1;
      for (let i = index; i > 0; i--) {
        const step = this.ajala.getFlattenSteps()[i];

        if (step?.skip) {
          continue;
        } else {
          valid_index = i;
          break;
        }
      }
    }

    return valid_index;
  }

  close() {
    const stepInActiveCallback =
      this.ajala.getOriginalSteps()[this.ajala.getActiveStepOriginalIndex()]
        ?.onInActive;
    if (stepInActiveCallback) {
      stepInActiveCallback(this.ajala.getActiveStep()!, this.ajala);
    }

    this.ajala.destroy();
    this.ajala.dispatchEvent({
      type: "onClose",
      data: this.ajala,
    });
  }

  async start() {
    this.animations!.is_animating = false;
    const valid_index = this.getValidNavIndex(0, "next");

    if (this.ajala.getFlattenSteps().length > valid_index) {
      this.goTo(valid_index);
    } else {
      this.ajala.dispatchEvent({
        type: "onFinish",
        data: this.ajala,
      });

      this.ajala.destroy();
    }
  }

  cleanUp() {
    if (this.placement) {
      this.placement.cleanUp();
    }
  }
}

export default Navigation;
